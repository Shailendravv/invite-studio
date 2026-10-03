import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EventSpecSchema, formatIssues } from "@invite/shared/schema";
import { TEMPLATES } from "@invite/shared/templates";
import { GENERATED_FILE, generatedSource } from "../../scripts/build-svg-docs";
import { SAMPLES, hindiSamples, stressSamples } from "../src/samples";
import { buildTimeline } from "../src/timeline";

const root = fs.readFileSync(path.join(__dirname, "../src/Root.tsx"), "utf8");

describe("template registry", () => {
  it.each(TEMPLATES.map((t) => t.id))("%s has a composition, a sample and a Hindi sample", (id) => {
    expect(root).toContain(`id="${id}"`);
    expect(SAMPLES[id]?.templateId).toBe(id);
    expect(hindiSamples.some((s) => s.templateId === id)).toBe(true);
  });

  it("every sample is a valid spec for its template", () => {
    for (const spec of [...Object.values(SAMPLES), ...hindiSamples, ...stressSamples]) {
      const result = EventSpecSchema.safeParse(spec);
      expect(result.success, result.success ? "" : `${spec.templateId}: ${formatIssues(result.error)}`).toBe(true);
    }
  });

  it("every sample plans a 30-45 s timeline", () => {
    for (const spec of Object.values(SAMPLES)) {
      const seconds = buildTimeline(spec).durationInFrames / 30;
      expect(seconds, spec.templateId).toBeGreaterThanOrEqual(30);
      expect(seconds, spec.templateId).toBeLessThanOrEqual(45.1);
    }
  });

  it("the generated SVG module is up to date with video/public/assets/svg (run `npm run svg:build`)", () => {
    expect(fs.readFileSync(GENERATED_FILE, "utf8")).toBe(generatedSource());
  });

  it("wed-royal adds a celebration scene for a Baraat function, other templates do not", () => {
    const royal = buildTimeline(SAMPLES["wed-royal"]);
    const scene = royal.scenes.find((s) => s.id === "celebration");
    expect(scene).toBeDefined();
    expect((SAMPLES["wed-royal"] as { functions: { name: string }[] }).functions[scene!.index].name).toBe("Baraat");
    expect(royal.scenes.findIndex((s) => s.id === "celebration")).toBeGreaterThan(royal.scenes.findIndex((s) => s.id === "functions"));
    const hindi = hindiSamples.find((s) => s.templateId === "wed-royal")!;
    expect(buildTimeline(hindi).scenes.some((s) => s.id === "celebration")).toBe(true); // बारात
    for (const [id, spec] of Object.entries(SAMPLES)) if (id !== "wed-royal") expect(buildTimeline(spec).scenes.some((s) => s.id === "celebration"), id).toBe(false);
    const noBaraat = { ...SAMPLES["wed-royal"], functions: [{ name: "Pheras", date: "2027-02-05", displayDate: "Friday, 5 February 2027" }] } as typeof SAMPLES[string];
    expect(buildTimeline(noBaraat).scenes.some((s) => s.id === "celebration")).toBe(false);
  });

  it("ceremony templates are all wedding templates", () => {
    for (const t of TEMPLATES.filter((x) => "ceremony" in x)) expect(t.eventType).toBe("wedding");
  });
});
