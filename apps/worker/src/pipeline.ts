import fs from "node:fs";
import path from "node:path";
import { chooseTemplate, detectCeremony, parseOrder, reviseSpec, runVisualQa, todayLocal, type QaStill } from "@invite/shared/agent";
import * as repo from "@invite/shared/db";
import type { DB, Job, Order } from "@invite/shared/db";
import { config, repoRoot } from "@invite/shared/env";
import { clientDisplayName, eventLabel } from "@invite/shared/format";
import type { LLMProvider } from "@invite/shared/llm";
import { applySpecAndQueueRender, isAudioFile, isImageFile, orderLinks } from "@invite/shared/orders";
import { EventSpecSchema, type EventSpec } from "@invite/shared/schema";
import { slugify } from "@invite/shared/slug";
import { FILES, clientFolder, fileKey, type StorageAdapter } from "@invite/shared/storage";
import { displayTime, wordingLines } from "@invite/video/i18n";
import { buildTimeline, keyFrames } from "@invite/video/timeline";
import { makeShareCopy, probeDuration } from "./ffmpeg";
import { sendNotification } from "./notify";
import { getBundle, renderStillPng, renderVideo, stageAssets } from "./render";

export interface PipelineContext {
  db: DB;
  storage: StorageAdapter;
  llm: () => LLMProvider;
  renderConcurrency?: number | null;
  qaEnabled?: boolean;
}

function log(ctx: PipelineContext, orderId: string, step: string, message: string) {
  repo.logEvent(ctx.db, orderId, step, message);
  console.log(`[${new Date().toISOString()}] ${orderId} ${step}: ${message}`);
}

async function listUploads(storage: StorageAdapter, order: Order) {
  const objs = await storage.list(`${order.folderKey}/${FILES.uploads}`);
  const names = objs.map((o) => path.posix.basename(o.key)).sort();
  return { photos: names.filter(isImageFile), audio: names.find(isAudioFile) };
}

// ------------------------------------------------------------------ Step A + B: parse and decide

export async function handleParse(ctx: PipelineContext, job: Job): Promise<void> {
  const order = repo.getOrder(ctx.db, job.orderId);
  if (!order) return;
  repo.updateOrder(ctx.db, order.id, { status: "parsing", error: null });
  const today = todayLocal();
  const { photos, audio } = await listUploads(ctx.storage, order);
  const audioInfo = audio
    ? { file: audio, durationSec: Math.round((await probeDuration(ctx.storage.localPath(`${order.folderKey}/${FILES.uploads}/${audio}`))) * 10) / 10 }
    : undefined;

  let spec: EventSpec;
  if (order.revisionOf && order.revisionRequest) {
    const parent = repo.getOrder(ctx.db, order.revisionOf);
    if (!parent?.specJson) throw new Error("The original order no longer has a spec");
    log(ctx, order.id, "revise", `Applying change: "${order.revisionRequest}"`);
    const result = await reviseSpec(ctx.llm(), EventSpecSchema.parse(JSON.parse(parent.specJson)), order.revisionRequest, today);
    log(ctx, order.id, "revise", result.summary || "Spec updated");
    spec = result.spec;
  } else {
    log(ctx, order.id, "parse", `Reading the message with ${ctx.llm().name}/${ctx.llm().model}`);
    const outcome = await parseOrder(ctx.llm(), {
      rawText: order.rawText,
      today,
      templateChoice: order.templateChoice,
      photos,
      audio: audioInfo,
    });
    for (const w of outcome.warnings) log(ctx, order.id, "parse", `Warning: ${w}`);
    if (outcome.status === "needs_info") {
      const name = clientDisplayName({ eventType: outcome.eventType ?? "birthday", ...outcome.partial });
      repo.updateOrder(ctx.db, order.id, {
        status: "needs_info",
        eventType: outcome.eventType,
        clientName: name || null,
        specJson: JSON.stringify(outcome.partial),
        missingFieldsJson: JSON.stringify(outcome.missing),
        clientQuestion: outcome.clientQuestion,
      });
      log(ctx, order.id, "needs_info", `Missing: ${outcome.missing.join(", ")}`);
      return;
    }
    spec = outcome.spec;
    if (!order.templateChoice) {
      const slug = slugify(clientDisplayName(spec));
      spec = {
        ...spec,
        templateId: chooseTemplate({
          eventType: spec.eventType,
          ceremony: detectCeremony(spec),
          usedByClient: repo.templatesUsedByClient(ctx.db, slug, order.id),
          usageCounts: repo.templateUsageCounts(ctx.db),
        }) as EventSpec["templateId"],
      };
    }
  }
  await markReady(ctx, order, spec);
}

/** Validates, stores spec.json and queues the render. */
export async function markReady(ctx: PipelineContext, order: Order, spec: EventSpec): Promise<void> {
  await applySpecAndQueueRender(ctx.db, ctx.storage, order, spec);
  console.log(`[${new Date().toISOString()}] ${order.id} ready: queued render (${spec.templateId})`);
}

// ------------------------------------------------------------------ Step C + D + E: render, QA, store

function progressReporter(ctx: PipelineContext, orderId: string) {
  let last = -1;
  let lastAt = 0;
  return (pct: number) => {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    const now = Date.now();
    if (p === last || (now - lastAt < 750 && p !== 100)) return;
    last = p;
    lastAt = now;
    repo.updateOrder(ctx.db, orderId, { progress: p });
  };
}

export async function handleRender(ctx: PipelineContext, job: Job): Promise<void> {
  const order = repo.getOrder(ctx.db, job.orderId);
  if (!order?.specJson) return;
  const spec = EventSpecSchema.parse(JSON.parse(order.specJson));
  const report = progressReporter(ctx, order.id);
  repo.updateOrder(ctx.db, order.id, { status: "rendering", progress: 1, error: null, warning: null });
  log(ctx, order.id, "render", `Rendering ${spec.templateId} (attempt ${job.attempts})`);

  const renderLog: string[] = [];
  const rlog = (m: string) => renderLog.push(`[${new Date().toISOString()}] ${m}`);
  const work = path.join(repoRoot(), ".render-cache", "work", order.id);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  const serveUrl = await getBundle(rlog);
  const { props, cleanup } = stageAssets(serveUrl, order.id, spec, ctx.storage.localPath(`${order.folderKey}/${FILES.uploads}`));
  try {
    const started = Date.now();
    const video = path.join(work, FILES.video);
    const { durationInFrames, fps } = await renderVideo({
      serveUrl,
      spec: props,
      output: video,
      concurrency: ctx.renderConcurrency,
      onProgress: (f) => report(1 + f * 84),
    });
    rlog(`Rendered ${durationInFrames} frames at ${fps}fps in ${((Date.now() - started) / 1000).toFixed(1)}s`);

    const duration = await probeDuration(video);
    const share = path.join(work, FILES.share);
    await makeShareCopy(video, share, duration);
    report(92);
    rlog(`Share copy: ${(fs.statSync(share).size / 1024 / 1024).toFixed(1)} MB (full: ${(fs.statSync(video).size / 1024 / 1024).toFixed(1)} MB)`);

    const frames = keyFrames(buildTimeline(spec, fps));
    const thumb = path.join(work, FILES.thumb);
    await renderStillPng({ serveUrl, spec: props, frame: frames.thumbnail, output: thumb });
    report(95);

    const warning = await quickQa(ctx, order, spec, props, serveUrl, frames.stills, work, rlog);
    report(98);

    // Step E: store under clients/<slug>/<date>_<type>_<id>/
    const folder = order.folderKey;
    await ctx.storage.putFile(fileKey(folder, FILES.video), video, { move: true });
    await ctx.storage.putFile(fileKey(folder, FILES.share), share, { move: true });
    await ctx.storage.putFile(fileKey(folder, FILES.thumb), thumb, { move: true });
    rlog("Stored outputs");
    await ctx.storage.put(fileKey(folder, FILES.log), renderLog.join("\n") + "\n");

    let finalFolder = folder;
    if (folder.startsWith("staging/")) {
      finalFolder = clientFolder({ clientSlug: order.clientSlug ?? "client", date: spec.date, eventType: spec.eventType, orderId: order.id });
      for (let n = 2; (await ctx.storage.list(finalFolder)).length > 0; n++) finalFolder = `${finalFolder.replace(/-\d+$/, "")}-${n}`;
      await ctx.storage.movePrefix(folder, finalFolder);
    }
    repo.updateOrder(ctx.db, order.id, {
      folderKey: finalFolder,
      videoPath: fileKey(finalFolder, FILES.video),
      sharePath: fileKey(finalFolder, FILES.share),
      thumbPath: fileKey(finalFolder, FILES.thumb),
      status: "done",
      progress: 100,
      warning,
      error: null,
    });
    log(ctx, order.id, "done", `Video saved in ${finalFolder}`);
    if (config.notifyProvider) repo.enqueueJob(ctx.db, order.id, "notify");
  } finally {
    cleanup();
    fs.rmSync(work, { recursive: true, force: true });
  }
}

/** Step D: proof-read three stills with a vision model. Never blocks delivery. */
async function quickQa(
  ctx: PipelineContext,
  order: Order,
  spec: EventSpec,
  props: EventSpec,
  serveUrl: string,
  stills: { label: string; frame: number }[],
  work: string,
  rlog: (m: string) => void,
): Promise<string | null> {
  if (!(ctx.qaEnabled ?? config.qaEnabled)) return null;
  let llm: LLMProvider;
  try {
    llm = ctx.llm();
  } catch {
    return null;
  }
  if (!llm.supportsImages) {
    rlog("QA skipped: LLM provider has no image support");
    return null;
  }
  const names = spec.eventType === "birthday" ? [spec.personName] : [spec.groomName, spec.brideName];
  const expected: Record<string, string[]> = {
    names,
    "date and venue": [spec.displayDate, displayTime(spec.time, spec), spec.venueName],
    closing: [wordingLines(spec, "closing").main],
  };
  try {
    const qaStills: QaStill[] = [];
    for (const s of stills) {
      const file = path.join(work, `qa-${s.label.replace(/\W+/g, "-")}.png`);
      await renderStillPng({ serveUrl, spec: props, frame: s.frame, output: file });
      qaStills.push({ label: s.label, expected: expected[s.label] ?? [], pngBase64: fs.readFileSync(file).toString("base64") });
    }
    const result = await runVisualQa(llm, qaStills);
    if (!result) return null;
    if (result.ok) {
      log(ctx, order.id, "qa", "Visual check passed");
      return null;
    }
    const issues = result.issues.join("; ");
    log(ctx, order.id, "qa", `Visual check flagged: ${issues}`);
    return issues;
  } catch (e) {
    log(ctx, order.id, "qa", `Visual check could not run: ${(e as Error).message}`);
    return null;
  }
}

// ------------------------------------------------------------------ notify

export async function handleNotify(ctx: PipelineContext, job: Job): Promise<void> {
  const order = repo.getOrder(ctx.db, job.orderId);
  if (!order || order.status !== "done") return;
  const links = orderLinks(ctx.storage, order);
  const link = links.share ?? links.video;
  const label = `${order.clientName ?? "Client"} ${eventLabel(order.eventType)}`;
  const res = await sendNotification("Video ready", `Video ready: ${label}`, link);
  if (res === "sent") log(ctx, order.id, "notify", `Notification sent (${config.notifyProvider})`);
}
