import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../env";
import type { JsonRequest, LLMProvider } from "./types";

export type MockHandler = (req: JsonRequest) => unknown | Promise<unknown>;

/** Test double: answers with whatever the handler returns. */
export class MockProvider implements LLMProvider {
  readonly name = "mock";
  readonly model = "mock";
  readonly calls: JsonRequest[] = [];
  constructor(
    private readonly handler: MockHandler,
    readonly supportsImages = false,
  ) {}

  async generateJson(req: JsonRequest): Promise<unknown> {
    this.calls.push(req);
    return this.handler(req);
  }
}

export function extractTagged(req: JsonRequest, tag: string): string | null {
  const text = req.content.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n");
  const m = text.match(new RegExp(`<${tag}>\\n?([\\s\\S]*?)\\n?</${tag}>`));
  return m ? m[1] : null;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * LLM_PROVIDER=mock: replays the recorded draft of a fixture whose text matches
 * the order (see fixtures/*.json). Unknown text yields an empty draft, so the
 * order lands in needs_info. Lets the whole app run end to end without an API key.
 */
export function createFixtureMockProvider(dir = path.join(repoRoot(), "fixtures")): MockProvider {
  const fixtures: { raw: string; mockDraft: unknown }[] = [];
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      try {
        const fx = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        if (fx.raw && fx.mockDraft) fixtures.push(fx);
      } catch {
        // ignore malformed fixture
      }
    }
  }
  return new MockProvider((req) => {
    if (req.schemaName === "event_draft") {
      const raw = extractTagged(req, "client_message") ?? "";
      // Longest fixture contained in the message wins (appended replies still match).
      const hit = fixtures
        .filter((f) => norm(raw).includes(norm(f.raw)))
        .sort((a, b) => b.raw.length - a.raw.length)[0];
      return hit ? hit.mockDraft : emptyDraft();
    }
    if (req.schemaName === "spec_patch") {
      const instruction = extractTagged(req, "change_request") ?? "";
      const time = instruction.match(/time\s+(?:to\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
      if (time) {
        return { operations: [{ op: "replace", path: "/time", valueJson: JSON.stringify(time[1].toUpperCase()) }], summary: `Time changed to ${time[1]}` };
      }
      return { operations: [], summary: "Mock provider: no change understood" };
    }
    if (req.schemaName === "qa_result") return { ok: true, issues: [] };
    throw new Error(`Mock provider has no answer for ${req.schemaName}`);
  });
}

function emptyDraft() {
  return {
    eventType: null,
    language: "en",
    languageStyle: "english",
    personName: null,
    age: null,
    hostedBy: null,
    brideName: null,
    groomName: null,
    brideFamily: null,
    groomFamily: null,
    date: null,
    displayDate: null,
    time: null,
    venueName: null,
    venueAddress: null,
    rsvp: null,
    blessingLine: null,
    functions: [],
    palette: null,
    wording: { headline: "", invitation: "", closing: "" },
    wordingHi: null,
    missingFields: [],
    clientQuestion: null,
  };
}
