import { describe, expect, it } from "vitest";
import { appearsInText, parseOrder, processDraft, ParseError, todayLocal, weekdayOf } from "../src/agent/parse";
import { buildClientQuestion } from "../src/agent/question";
import { MockProvider, extractTagged } from "../src/llm/mock";
import { EventSpecSchema } from "../src/schema";
import { compareOutcome, loadFixtures } from "./fixture-helpers";

const fixtures = loadFixtures();

describe("fixtures (recorded LLM drafts)", () => {
  it("has at least 10 fixtures", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(10);
  });

  for (const fx of fixtures) {
    it(`${fx.name}: ${fx.description}`, async () => {
      const llm = new MockProvider((req) => {
        expect(extractTagged(req, "client_message")).toBe(fx.raw);
        expect(req.content[0]).toMatchObject({ type: "text" });
        return fx.mockDraft;
      });
      const outcome = await parseOrder(llm, { rawText: fx.raw, today: fx.today });
      expect(compareOutcome(outcome, fx.expect)).toEqual([]);
      if (outcome.status === "ready") expect(EventSpecSchema.safeParse(outcome.spec).success).toBe(true);
    });
  }
});

const draftOf = (name: string) => structuredClone(fixtures.find((f) => f.name.startsWith(name))!.mockDraft) as any;
const rawOf = (name: string) => fixtures.find((f) => f.name.startsWith(name))!.raw;

describe("parseOrder", () => {
  it("retries once with validation errors, then succeeds", async () => {
    const good = draftOf("01");
    let n = 0;
    const llm = new MockProvider((req) => {
      n++;
      if (n === 1) return { eventType: "party" }; // invalid
      expect((req.content[0] as { text: string }).text).toContain("<validation_errors>");
      return good;
    });
    const outcome = await parseOrder(llm, { rawText: rawOf("01"), today: "2026-10-03" });
    expect(n).toBe(2);
    expect(outcome.status).toBe("ready");
  });

  it("fails after two invalid answers", async () => {
    const llm = new MockProvider(() => ({ nope: true }));
    await expect(parseOrder(llm, { rawText: "x", today: "2026-10-03" })).rejects.toBeInstanceOf(ParseError);
    expect(llm.calls).toHaveLength(2);
  });

  it("honours the owner's template choice when it fits the event type", async () => {
    const llm = new MockProvider(() => draftOf("01"));
    const a = await parseOrder(llm, { rawText: rawOf("01"), today: "2026-10-03", templateChoice: "eng-modern" });
    expect(a.status === "ready" && a.spec.templateId).toBe("eng-modern");
    const b = await parseOrder(llm, { rawText: rawOf("01"), today: "2026-10-03", templateChoice: "bday-playful" });
    expect(b.status === "ready" && b.spec.templateId).toBe("eng-traditional");
  });

  it("attaches uploaded photos and audio", async () => {
    const llm = new MockProvider(() => draftOf("01"));
    const out = await parseOrder(llm, {
      rawText: rawOf("01"),
      today: "2026-10-03",
      photos: ["p1.jpg"],
      audio: { file: "song.mp3", durationSec: 42 },
    });
    expect(out.status === "ready" && out.spec.photos).toEqual(["p1.jpg"]);
    expect(out.status === "ready" && out.spec.audio?.durationSec).toBe(42);
  });
});

describe("processDraft", () => {
  it("takes main wedding details from the pheras function when the main fields are empty", () => {
    const d = draftOf("06");
    d.date = null;
    d.time = null;
    d.venueName = null;
    const out = processDraft(d, { rawText: rawOf("06"), today: "2026-10-03" });
    expect(out.status).toBe("ready");
    if (out.status === "ready") {
      expect(out.spec.date).toBe("2027-01-26");
      expect(out.spec.time).toBe("8:00 PM");
      expect(out.spec.venueName).toBe("Royal Orchid Banquet");
    }
  });

  it("fills default wording and display date when the model leaves them empty", () => {
    const d = draftOf("01");
    d.wording = { headline: "", invitation: "", closing: "" };
    d.displayDate = null;
    const out = processDraft(d, { rawText: rawOf("01"), today: "2026-10-03" });
    expect(out.status === "ready" && out.spec.wording.headline).toBe("Engagement Ceremony");
    expect(out.status === "ready" && out.spec.displayDate).toBe("Sunday, 15 November 2026");
  });

  it("adds Hindi wording when language is both but the model omitted it", () => {
    const d = draftOf("14");
    d.wordingHi = null;
    const out = processDraft(d, { rawText: rawOf("14"), today: "2026-10-03" });
    expect(out.status === "ready" && out.spec.wordingHi?.headline).toBe("शुभ विवाह");
  });

  it("drops invalid dates and colours with warnings", () => {
    const d = draftOf("01");
    d.date = "2026-02-30";
    d.palette = { primary: "gold", secondary: "#000000", accent: "#000000", background: "#000000", text: "#ffffff" };
    const out = processDraft(d, { rawText: rawOf("01"), today: "2026-10-03" });
    expect(out.status).toBe("needs_info");
    expect(out.warnings.join("\n")).toMatch(/invalid date/);
    expect(out.warnings.join("\n")).toMatch(/palette/);
  });

  it("warns when the event date is in the past", () => {
    const out = processDraft(draftOf("01"), { rawText: rawOf("01"), today: "2026-12-01" });
    expect(out.warnings.join("\n")).toMatch(/in the past/);
  });

  it("uses a deterministic question when the model's missing list disagrees", () => {
    const d = draftOf("13");
    const out = processDraft(d, { rawText: rawOf("13"), today: "2026-10-03" });
    expect(out.status).toBe("needs_info");
    if (out.status === "needs_info") expect(out.clientQuestion).toContain("venue ka naam aur address");
  });
});

describe("helpers", () => {
  it("appearsInText ignores case and accents, skips Devanagari", () => {
    expect(appearsInText("Hotel Raj Palace", "at hotel raj palace jaipur")).toBe(true);
    expect(appearsInText("Hotel Grand Celebration", "party ki jagah baad me")).toBe(false);
    expect(appearsInText("पूजा", "anything")).toBe(true);
  });

  it("builds questions in each style", () => {
    expect(buildClientQuestion(["date", "venueName"], "english", "wedding")).toContain("the date and the venue name and address");
    expect(buildClientQuestion(["time"], "hindi", "birthday")).toContain("समय");
    expect(buildClientQuestion(["brideName"], "hinglish", "engagement")).toContain("dulhan ka naam");
  });

  it("formats dates", () => {
    expect(weekdayOf("2026-10-03")).toBe("Saturday");
    expect(todayLocal(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
