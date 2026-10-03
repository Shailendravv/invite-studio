// Renders chosen frames of one sample and tiles them into a contact sheet, to
// review how a template animates (render-stills only shows each scene's settled look).
//   npm run frames -- haldi-marigold 4,16,30,48,72,110
//   npm run frames -- mehndi-henna 0,10,20,40,70,100 hi     (Hindi variant)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "@invite/shared/env";
import { getBundle, closeBrowser, renderStillPng } from "../apps/worker/src/render";
import type { EventSpec } from "@invite/shared/schema";
import { SAMPLES, hindiSamples } from "@invite/video/samples";

const [templateId, frameList = "5,20,40,60,90,130", lang = "en"] = process.argv.slice(2);
// A path to a real order's spec.json works in place of a template id.
const spec = templateId?.endsWith(".json")
  ? (JSON.parse(fs.readFileSync(templateId, "utf8")) as EventSpec)
  : lang === "hi" ? hindiSamples.find((s) => s.templateId === templateId) : SAMPLES[templateId ?? ""];
if (!templateId || !spec) {
  console.error(`Usage: npm run frames -- <templateId> [frame,frame,...] [en|hi]\nTemplates: ${Object.keys(SAMPLES).join(", ")}`);
  process.exit(1);
}
const frames = frameList.split(",").map((f) => Number(f.trim()));
const name = templateId?.endsWith(".json") ? `order-${path.basename(path.dirname(path.resolve(templateId)))}` : `${templateId}-${lang}`;
const outDir = path.join(repoRoot(), ".render-cache", "stills", `${name}-frames`);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await getBundle(console.log);
const files: string[] = [];
for (const frame of frames) {
  const file = path.join(outDir, `f${String(frame).padStart(4, "0")}.png`);
  await renderStillPng({ serveUrl, spec, frame, output: file });
  files.push(file);
}
await closeBrowser();

if (files.length === 1) {
  console.log(`frame ${frames[0]} -> ${path.relative(repoRoot(), files[0])}`);
  process.exit(0);
}
const cols = Math.min(6, files.length);
const rows = Math.ceil(files.length / cols);
const sheet = path.join(repoRoot(), ".render-cache", "stills", `${name}-frames.png`);
execFileSync("ffmpeg", [
  "-loglevel", "error", "-y",
  ...files.flatMap((f) => ["-i", f]),
  "-filter_complex",
  `${files.map((_, i) => `[${i}:v]scale=240:427,setsar=1[v${i}]`).join(";")};${files.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * 240}_${Math.floor(i / cols) * 427}`).join("|")}[out]`,
  "-map", "[out]", "-frames:v", "1", sheet,
]);
console.log(`${templateId} frames ${frames.join(", ")} -> ${path.relative(repoRoot(), sheet)} (${cols}x${rows})`);
