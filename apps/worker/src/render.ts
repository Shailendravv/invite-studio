// Remotion rendering: bundle once per process, then render stills / videos.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, openBrowser, renderMedia, renderStill, selectComposition, type HeadlessBrowser } from "@remotion/renderer";
import { repoRoot } from "@invite/shared/env";
import type { EventSpec } from "@invite/shared/schema";

let bundlePromise: Promise<string> | null = null;
let browserPromise: Promise<HeadlessBrowser> | null = null;

const videoDir = () => path.join(repoRoot(), "video");

/** Bundles the Remotion project once and reuses it for every render. */
export function getBundle(log: (m: string) => void = () => {}): Promise<string> {
  bundlePromise ??= (async () => {
    const outDir = path.join(repoRoot(), ".remotion-bundle");
    log("Bundling Remotion project...");
    const started = Date.now();
    const url = await bundle({
      entryPoint: path.join(videoDir(), "src", "index.ts"),
      publicDir: path.join(videoDir(), "public"),
      outDir,
      onProgress: () => {},
    });
    log(`Bundle ready in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return url;
  })().catch((e) => {
    bundlePromise = null;
    throw e;
  });
  return bundlePromise;
}

export function getBrowser(): Promise<HeadlessBrowser> {
  browserPromise ??= (async () => {
    await ensureBrowser();
    return openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
  })().catch((e) => {
    browserPromise = null;
    throw e;
  });
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  await b?.close({ silent: true }).catch(() => {});
}

/**
 * Copies an order's uploads into the bundle's public folder so templates can
 * load them with staticFile(), and rewrites the spec paths accordingly.
 */
export function stageAssets(serveUrl: string, renderId: string, spec: EventSpec, uploadsDir: string): { props: EventSpec; cleanup: () => void } {
  const files = [...(spec.photos ?? []), ...(spec.audio ? [spec.audio.file] : [])];
  if (!files.length) return { props: spec, cleanup: () => {} };
  const rel = `assets/${renderId}`;
  const dest = path.join(serveUrl, "public", "assets", renderId);
  fs.mkdirSync(dest, { recursive: true });
  for (const f of files) {
    const name = path.basename(f);
    fs.copyFileSync(path.join(uploadsDir, name), path.join(dest, name));
  }
  const props: EventSpec = {
    ...spec,
    photos: spec.photos?.map((p) => `${rel}/${path.basename(p)}`),
    audio: spec.audio ? { ...spec.audio, file: `${rel}/${path.basename(spec.audio.file)}` } : undefined,
  };
  return { props, cleanup: () => fs.rmSync(dest, { recursive: true, force: true }) };
}

export async function renderStillPng(args: { serveUrl: string; spec: EventSpec; frame: number; output: string }): Promise<void> {
  const browser = await getBrowser();
  const inputProps = { spec: args.spec };
  const composition = await selectComposition({ serveUrl: args.serveUrl, id: args.spec.templateId, inputProps, puppeteerInstance: browser });
  await renderStill({
    composition,
    serveUrl: args.serveUrl,
    output: args.output,
    frame: Math.min(args.frame, composition.durationInFrames - 1),
    inputProps,
    imageFormat: "png",
    puppeteerInstance: browser,
    overwrite: true,
  });
}

export async function renderVideo(args: {
  serveUrl: string;
  spec: EventSpec;
  output: string;
  concurrency?: number | null;
  onProgress?: (fraction: number) => void;
}): Promise<{ durationInFrames: number; fps: number }> {
  const browser = await getBrowser();
  // Wrapped as { spec } so no sample defaultProps leak into a client's video (see video/src/Root.tsx).
  const inputProps = { spec: args.spec };
  const composition = await selectComposition({ serveUrl: args.serveUrl, id: args.spec.templateId, inputProps, puppeteerInstance: browser });
  await renderMedia({
    composition,
    serveUrl: args.serveUrl,
    codec: "h264",
    outputLocation: args.output,
    inputProps,
    puppeteerInstance: browser,
    crf: 18,
    pixelFormat: "yuv420p",
    enforceAudioTrack: true, // silent track when there is no audio
    concurrency: args.concurrency ?? undefined,
    overwrite: true,
    onProgress: ({ progress }) => args.onProgress?.(progress),
  });
  return { durationInFrames: composition.durationInFrames, fps: composition.fps };
}
