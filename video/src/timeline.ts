// Pure scene planning, shared by the compositions (calculateMetadata) and the
// worker (which frames to render as stills / thumbnail). No React here.
import type { EventSpec } from "@invite/shared/schema";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type SceneId = "intro" | "names" | "invitation" | "details" | "functions" | "function" | "celebration" | "photo" | "closing";

export interface Scene {
  id: SceneId;
  /** Index for repeated scenes (function n, photo n). */
  index: number;
  from: number;
  duration: number;
}

export interface Timeline {
  scenes: Scene[];
  durationInFrames: number;
}

/** Templates that show each wedding function as its own scene. */
const SEQUENTIAL_FUNCTIONS = new Set(["wed-floral", "wed-midnight"]);
const MAX_FUNCTIONS_IN_LIST = 4;

/** Templates that give a Baraat function its own scene (horse, dhol, shehnai). */
const CELEBRATION_TEMPLATES = new Set(["wed-royal"]);
const BARAAT = /baraat|baarat|barat|बारात|बरात/i;
const MAX_PHOTOS = 3;

export const MIN_SECONDS = 30;
export const MAX_SECONDS = 45;
export const MAX_AUDIO_SECONDS = 90;

interface Planned {
  id: SceneId;
  index: number;
  base: number;
  min: number;
}

function plan(spec: EventSpec): Planned[] {
  const scenes: Planned[] = [
    { id: "intro", index: 0, base: 4.5, min: 3 },
    { id: "names", index: 0, base: 6, min: 4 },
    { id: "invitation", index: 0, base: 5, min: 3.5 },
    { id: "details", index: 0, base: 7.5, min: 5 },
  ];
  const functions = spec.eventType === "wedding" ? (spec.functions ?? []) : [];
  if (functions.length) {
    if (SEQUENTIAL_FUNCTIONS.has(spec.templateId) || functions.length > MAX_FUNCTIONS_IN_LIST) {
      functions.forEach((_, i) => scenes.push({ id: "function", index: i, base: 4.5, min: 3.5 }));
    } else {
      scenes.push({ id: "functions", index: 0, base: 4 + functions.length * 1.5, min: 3 + functions.length });
    }
    const baraat = CELEBRATION_TEMPLATES.has(spec.templateId) ? functions.findIndex((f) => BARAAT.test(f.name)) : -1;
    if (baraat >= 0) scenes.push({ id: "celebration", index: baraat, base: 5, min: 3.5 });
  }
  (spec.photos ?? []).slice(0, MAX_PHOTOS).forEach((_, i) => scenes.push({ id: "photo", index: i, base: 3.5, min: 3 }));
  scenes.push({ id: "closing", index: 0, base: 5.5, min: 4 });
  return scenes;
}

/** Distributes `target` seconds over the scenes: stretch proportionally, or shrink toward each minimum. */
function fit(scenes: Planned[], target: number): number[] {
  const base = scenes.reduce((s, x) => s + x.base, 0);
  const min = scenes.reduce((s, x) => s + x.min, 0);
  if (target >= base) return scenes.map((s) => (s.base * target) / base);
  if (target <= min) return scenes.map((s) => s.min);
  const t = (target - min) / (base - min);
  return scenes.map((s) => s.min + (s.base - s.min) * t);
}

export function buildTimeline(spec: EventSpec, fps = FPS): Timeline {
  const planned = plan(spec);
  const base = planned.reduce((s, x) => s + x.base, 0);
  const audioSec = spec.audio?.durationSec;
  const target = audioSec
    ? Math.min(Math.max(audioSec, planned.reduce((s, x) => s + x.min, 0)), MAX_AUDIO_SECONDS)
    : Math.min(Math.max(base, MIN_SECONDS), MAX_SECONDS);
  const seconds = fit(planned, target);
  const scenes: Scene[] = [];
  let from = 0;
  planned.forEach((p, i) => {
    const duration = Math.round(seconds[i] * fps);
    scenes.push({ id: p.id, index: p.index, from, duration });
    from += duration;
  });
  return { scenes, durationInFrames: from };
}

export interface StillPlan {
  label: string;
  frame: number;
  scene: SceneId;
}

/** Frames used for QA stills and the thumbnail (late in each scene, after entrances settle). */
export function keyFrames(timeline: Timeline): { thumbnail: number; stills: StillPlan[] } {
  const at = (id: SceneId, ratio = 0.6) => {
    const s = timeline.scenes.find((x) => x.id === id)!;
    return s.from + Math.round(s.duration * ratio);
  };
  return {
    thumbnail: at("names", 0.65),
    stills: [
      { label: "names", frame: at("names"), scene: "names" },
      { label: "date and venue", frame: at("details"), scene: "details" },
      { label: "closing", frame: at("closing", 0.5), scene: "closing" },
    ],
  };
}

/** Every scene's midpoint, for reviewing templates scene by scene. */
export function allSceneFrames(timeline: Timeline): { label: string; frame: number }[] {
  return timeline.scenes.map((s) => ({
    label: s.id === "function" || s.id === "photo" ? `${s.id}-${s.index + 1}` : s.id,
    frame: s.from + Math.round(s.duration * 0.6),
  }));
}
