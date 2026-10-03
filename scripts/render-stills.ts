// Renders a still of every scene of every template (English, Hindi and stress
// samples) and tiles them into one contact sheet per sample for review.
//   npm run stills            (all)
//   npm run stills -- wed     (only samples whose name contains "wed")
//   npm run stills -- storage/clients/x/y/spec.json   (a real order's spec)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { EventSpecSchema, formatIssues, type EventSpec } from "@invite/shared/schema";
import { repoRoot } from "@invite/shared/env";
import { getBundle, closeBrowser, renderStillPng } from "../apps/worker/src/render";
import { SAMPLES, hindiSamples, stressSamples } from "@invite/video/samples";
import { allSceneFrames, buildTimeline } from "@invite/video/timeline";

const filter = process.argv[2] ?? "";
const outRoot = path.join(repoRoot(), ".render-cache", "stills");
fs.mkdirSync(outRoot, { recursive: true });

const samples: { name: string; spec: EventSpec }[] = filter.endsWith(".json")
  ? [{ name: `order-${path.basename(path.dirname(path.resolve(filter)))}`, spec: JSON.parse(fs.readFileSync(filter, "utf8")) as EventSpec }]
  : [
      ...Object.entries(SAMPLES).map(([k, spec]) => ({ name: `${k}-en`, spec })),
      ...hindiSamples.map((spec) => ({ name: `${spec.templateId}-hi`, spec })),
      ...stressSamples.map((spec, i) => ({ name: `${spec.templateId}-stress${i + 1}`, spec })),
    ].filter((s) => s.name.includes(filter));

const serveUrl = await getBundle(console.log);

for (const { name, spec } of samples) {
  const valid = EventSpecSchema.safeParse(spec);
  if (!valid.success) {
    console.error(`${name}: sample is not a valid spec\n${formatIssues(valid.error)}`);
    process.exitCode = 1;
    continue;
  }
  const dir = path.join(outRoot, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = allSceneFrames(buildTimeline(spec));
  const files: string[] = [];
  for (const [i, f] of frames.entries()) {
    const file = path.join(dir, `${String(i).padStart(2, "0")}-${f.label}.png`);
    await renderStillPng({ serveUrl, spec, frame: f.frame, output: file });
    files.push(file);
  }
  // Contact sheet: scaled-down scenes side by side (4 per row).
  const cols = Math.min(4, files.length);
  const rows = Math.ceil(files.length / cols);
  const sheet = path.join(outRoot, `${name}.png`);
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y",
    ...files.flatMap((f) => ["-i", f]),
    ...Array.from({ length: cols * rows - files.length }).flatMap(() => ["-f", "lavfi", "-i", "color=c=gray:s=1080x1920:d=1"]),
    "-filter_complex",
    `${Array.from({ length: cols * rows }, (_, i) => `[${i}:v]scale=360:640,setsar=1[v${i}]`).join(";")};${Array.from({ length: cols * rows }, (_, i) => `[v${i}]`).join("")}xstack=inputs=${cols * rows}:layout=${Array.from({ length: cols * rows }, (_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 640}`).join("|")}[out]`,
    "-map", "[out]", "-frames:v", "1", sheet,
  ]);
  console.log(`${name}: ${files.length} scenes -> ${path.relative(repoRoot(), sheet)}`);
}

await closeBrowser();
