// Worker: polls the jobs table. Parse/notify jobs run concurrently (PARSE_CONCURRENCY),
// renders run one at a time because they use every CPU core.
import { ZodError } from "zod";
import { ParseError } from "@invite/shared/agent";
import * as repo from "@invite/shared/db";
import { getDb, type Job } from "@invite/shared/db";
import { config } from "@invite/shared/env";
import { createLLM, LLMError, type LLMProvider } from "@invite/shared/llm";
import { getStorage } from "@invite/shared/storage";
import { ffmpegAvailable } from "./ffmpeg";
import { handleNotify, handleParse, handleRender, type PipelineContext } from "./pipeline";
import { closeBrowser, getBrowser, getBundle } from "./render";

const db = getDb();
let llm: LLMProvider | null = null;

const ctx: PipelineContext = {
  db,
  storage: getStorage(),
  llm: () => (llm ??= createLLM()),
  renderConcurrency: config.renderConcurrency,
};

const runningLight = new Map<number, Promise<void>>();
let renderRunning: Promise<void> | null = null;
let stopping = false;

function isRetryable(e: unknown): boolean {
  if (e instanceof ParseError || e instanceof LLMError) return e.retryable;
  if (e instanceof ZodError) return false;
  return true;
}

async function run(job: Job): Promise<void> {
  try {
    if (job.type === "parse") await handleParse(ctx, job);
    else if (job.type === "render") await handleRender(ctx, job);
    else await handleNotify(ctx, job);
    repo.completeJob(db, job.id);
  } catch (e) {
    const message = e instanceof ZodError ? `Invalid spec: ${e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` : (e as Error).message;
    console.error(`[${new Date().toISOString()}] job ${job.id} (${job.type}) failed:`, e);
    const outcome = repo.failJob(db, job, message, { retryable: isRetryable(e) });
    if (job.type === "notify") {
      repo.logEvent(db, job.orderId, "notify", `Notification failed: ${message}`);
      return;
    }
    if (outcome === "retry") {
      const wait = Math.round(repo.backoffMs(job.attempts) / 1000);
      repo.updateOrder(db, job.orderId, { error: `Attempt ${job.attempts} failed: ${message}. Retrying in ${wait}s.` });
      repo.logEvent(db, job.orderId, job.type, `Attempt ${job.attempts} failed, retrying in ${wait}s: ${message}`);
    } else {
      repo.updateOrder(db, job.orderId, { status: "failed", error: message });
      repo.logEvent(db, job.orderId, "failed", message);
    }
  }
}

function tick(): void {
  if (stopping) return;
  try {
    while (runningLight.size < config.parseConcurrency) {
      const job = repo.claimJob(db, ["parse", "notify"]);
      if (!job) break;
      runningLight.set(
        job.id,
        run(job).finally(() => runningLight.delete(job.id)),
      );
    }
    if (!renderRunning) {
      const job = repo.claimJob(db, ["render"]);
      if (job) renderRunning = run(job).finally(() => (renderRunning = null));
    }
  } catch (e) {
    console.error("Worker tick failed:", e);
  }
}

async function main() {
  console.log(`Invite Studio worker starting (LLM: ${config.llmProvider}, poll: ${config.workerPollMs}ms)`);
  if (!(await ffmpegAvailable())) {
    console.error("ffmpeg/ffprobe not found on PATH. Install ffmpeg before rendering videos.");
  }
  try {
    ctx.llm();
  } catch (e) {
    console.error(`LLM not ready: ${(e as Error).message}. Parse jobs will fail until this is fixed.`);
  }
  const requeued = repo.requeueStaleJobs(db);
  if (requeued) console.log(`Re-queued ${requeued} job(s) interrupted by a restart`);
  // Bundle once up front so the first render starts quickly.
  getBundle(console.log)
    .then(() => getBrowser())
    .catch((e) => console.error("Pre-bundling failed (will retry on first render):", e));
  const timer = setInterval(tick, config.workerPollMs);
  tick();

  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    console.log(`${signal} received, finishing running jobs...`);
    await Promise.allSettled([renderRunning, ...runningLight.values()]);
    await closeBrowser();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
