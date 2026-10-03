// End-to-end check of the worker pipeline without the web app or an API key:
// fixture text -> order -> parse (mock LLM) -> render -> share copy -> thumbnail
// -> storage/clients/<slug>/... . Uses an isolated data folder.
//   npm run e2e                  (mock LLM, default)
//   npm run e2e -- --live        (LLM from .env)
import fs from "node:fs";
import path from "node:path";

const live = process.argv.includes("--live");
const root = path.resolve(import.meta.dirname, "..");
const sandbox = path.join(root, ".render-cache", "e2e");
fs.rmSync(sandbox, { recursive: true, force: true });
process.env.DATABASE_PATH = path.join(sandbox, "app.db");
process.env.STORAGE_ROOT = path.join(sandbox, "storage");
process.env.SIGNING_SECRET ||= "e2e-signing-secret-e2e-signing-secret";
process.env.QA_ENABLED = live ? process.env.QA_ENABLED ?? "true" : "false";
process.env.NOTIFY_PROVIDER = "";
if (!live) process.env.LLM_PROVIDER = "mock";

const { getDb } = await import("@invite/shared/db");
const repo = await import("@invite/shared/db");
const { getStorage } = await import("@invite/shared/storage");
const { createLLM } = await import("@invite/shared/llm");
const { createOrderWithFiles, orderLinks, validateUploads } = await import("@invite/shared/orders");
const { handleParse, handleRender } = await import("../apps/worker/src/pipeline");
const { closeBrowser } = await import("../apps/worker/src/render");
const { probeDuration } = await import("../apps/worker/src/ffmpeg");

const db = getDb();
const storage = getStorage();
const ctx = { db, storage, llm: (() => {
  const l = createLLM();
  return () => l;
})() };

function fixture(name: string) {
  return JSON.parse(fs.readFileSync(path.join(root, "fixtures", `${name}.json`), "utf8"));
}

async function runQueued(type: "parse" | "render") {
  const job = repo.claimJob(db, [type]);
  if (!job) throw new Error(`No ${type} job queued`);
  if (type === "parse") await handleParse(ctx, job);
  else await handleRender(ctx, job);
  repo.completeJob(db, job.id);
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`E2E assertion failed: ${msg}`);
  console.log(`  ok  ${msg}`);
}

const started = Date.now();

// 1) Missing details -> needs_info with a question for the client
console.log("\n[1] Order with a missing date");
{
  const fx = fixture("04-missing-date");
  const order = await createOrderWithFiles(db, storage, { rawText: fx.raw });
  assert(await storage.exists(`${order.folderKey}/raw.txt`), "raw.txt saved immediately");
  await runQueued("parse");
  const o = repo.getOrder(db, order.id)!;
  assert(o.status === "needs_info", `status is needs_info (got ${o.status})`);
  assert(JSON.parse(o.missingFieldsJson!).includes("date"), "date listed as missing");
  assert(o.clientQuestion && o.clientQuestion.length > 10, `client question: "${o.clientQuestion}"`);
}

// 2) Complete message with a photo -> rendered video in the client folder
console.log("\n[2] Complete engagement order with a photo");
{
  const fx = fixture("01-english-engagement");
  const photo = fs.readFileSync(path.join(root, "video", "public", "samples", "photo1.jpg"));
  const files = validateUploads([{ name: "couple.jpg", type: "image/jpeg", data: photo }]);
  const order = await createOrderWithFiles(db, storage, { rawText: fx.raw, files });
  await runQueued("parse");
  let o = repo.getOrder(db, order.id)!;
  assert(o.status === "ready", `parsed to ready (got ${o.status}${o.error ? `: ${o.error}` : ""})`);
  assert(o.clientSlug === "rahul-priya", `client slug ${o.clientSlug}`);
  const spec = JSON.parse(o.specJson!);
  assert(spec.photos?.length === 1, "photo attached to spec");

  console.log("  rendering (this takes a minute or two)...");
  const t = Date.now();
  await runQueued("render");
  o = repo.getOrder(db, order.id)!;
  assert(o.status === "done", `status done (got ${o.status}${o.error ? `: ${o.error}` : ""})`);
  assert(o.folderKey.startsWith("clients/rahul-priya/2026-11-15_engagement_"), `folder ${o.folderKey}`);
  for (const f of ["raw.txt", "spec.json", "uploads/photo-01.jpg", "invitation.mp4", "invitation_share.mp4", "thumbnail.png", "render.log"]) {
    assert(await storage.exists(`${o.folderKey}/${f}`), `${f} exists`);
  }
  assert(!(await storage.list(`staging/${o.id}`)).length, "staging folder cleaned up");
  const full = storage.localPath(o.videoPath!);
  const share = storage.localPath(o.sharePath!);
  const dur = await probeDuration(full);
  assert(dur >= 29 && dur <= 46, `duration ${dur.toFixed(1)}s within 30-45s`);
  const shareMb = fs.statSync(share).size / 1024 / 1024;
  assert(shareMb < 16, `share copy ${shareMb.toFixed(1)} MB < 16 MB`);
  // Regression: Remotion merges defaultProps into inputProps; sample-only fields must not leak.
  const { selectComposition } = await import("@remotion/renderer");
  const { getBundle, getBrowser } = await import("../apps/worker/src/render");
  const comp = await selectComposition({ serveUrl: await getBundle(), id: spec.templateId, inputProps: { spec }, puppeteerInstance: await getBrowser() });
  const resolved = (comp.props as { spec: Record<string, unknown> }).spec;
  assert(resolved.blessingLine === undefined && resolved.groomFamily === undefined, "no sample defaults leak into the client's props");
  const links = orderLinks(storage, o);
  assert(links.video?.includes("/api/files/") && !links.video.includes("clients/"), "signed link hides the path");
  console.log(`  render took ${((Date.now() - t) / 1000).toFixed(0)}s; full ${(fs.statSync(full).size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  output: ${path.join(process.env.STORAGE_ROOT!, o.folderKey)}`);
}

await closeBrowser();
console.log(`\nE2E passed in ${((Date.now() - started) / 1000).toFixed(0)}s`);
process.exit(0);
