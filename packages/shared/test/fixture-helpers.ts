import fs from "node:fs";
import path from "node:path";
import type { ParseOutcome } from "../src/agent/parse";
import { repoRoot } from "../src/env";

export interface Fixture {
  name: string;
  description: string;
  mockOnly?: boolean;
  today: string;
  raw: string;
  expect: {
    status: "ready" | "needs_info";
    eventType: string | null;
    missing?: string[];
    functionsCount?: number;
    fields?: Record<string, string | number>;
  };
  mockDraft: unknown;
}

export function loadFixtures(): Fixture[] {
  const dir = path.join(repoRoot(), "fixtures");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}

/** "7 pm" / "7:00PM" / "19:00" -> "7:00 PM" so equivalent spellings compare equal. */
export function normTime(t: unknown): string {
  const s = String(t ?? "").trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!m) return s;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  let ap = m[3];
  if (!ap) {
    ap = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
  }
  return `${h}:${min} ${ap}`;
}

/** Returns human-readable mismatches between an outcome and a fixture's expectations. */
export function compareOutcome(outcome: ParseOutcome, expect: Fixture["expect"]): string[] {
  const problems: string[] = [];
  if (outcome.status !== expect.status) problems.push(`status: expected ${expect.status}, got ${outcome.status}`);
  if (outcome.status === "needs_info") {
    if ((outcome.eventType ?? null) !== expect.eventType) problems.push(`eventType: expected ${expect.eventType}, got ${outcome.eventType}`);
    if (expect.missing && [...outcome.missing].sort().join(",") !== [...expect.missing].sort().join(",")) {
      problems.push(`missing: expected [${expect.missing}], got [${outcome.missing}]`);
    }
    if (!outcome.clientQuestion.trim()) problems.push("clientQuestion is empty");
    return problems;
  }
  const spec = outcome.spec as Record<string, unknown>;
  if (spec.eventType !== expect.eventType) problems.push(`eventType: expected ${expect.eventType}, got ${spec.eventType}`);
  for (const [key, want] of Object.entries(expect.fields ?? {})) {
    const got = spec[key];
    let ok: boolean;
    if (key === "time") ok = normTime(got) === normTime(want);
    else if (key === "venueName") ok = String(got ?? "").toLowerCase().includes(String(want).toLowerCase());
    else if (typeof want === "string") ok = String(got ?? "").toLowerCase() === want.toLowerCase();
    else ok = got === want;
    if (!ok) problems.push(`${key}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
  }
  if (expect.functionsCount !== undefined) {
    const n = Array.isArray(spec.functions) ? spec.functions.length : 0;
    if (n !== expect.functionsCount) problems.push(`functions: expected ${expect.functionsCount}, got ${n}`);
  }
  return problems;
}
