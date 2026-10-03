import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { chooseTemplate, detectCeremony } from "../src/agent/decide";
import { applyPatch, PatchError } from "../src/agent/json-patch";
import { reviseSpec } from "../src/agent/revise";
import { openDb } from "../src/db";
import * as repo from "../src/db/repo";
import { clientDisplayName, formatDisplayDate } from "../src/format";
import { MockProvider } from "../src/llm/mock";
import { toLlmJsonSchema } from "../src/llm/types";
import { EventDraftSchema, EventSpecSchema, type EventSpec } from "../src/schema";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../src/security";
import { slugify, transliterateDevanagari } from "../src/slug";
import { clientFolder, LocalDiskStorage, normalizeKey } from "../src/storage";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "invite-test-"));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const SECRET = "test-secret-test-secret-test-secret";

const engagement: EventSpec = {
  eventType: "engagement",
  language: "en",
  date: "2026-11-15",
  displayDate: "Sunday, 15 November 2026",
  time: "7:00 PM",
  venueName: "Hotel Raj Palace",
  templateId: "eng-traditional",
  brideName: "Priya",
  groomName: "Rahul",
  wording: { headline: "Engagement Ceremony", invitation: "Please join us.", closing: "Thank you" },
};

describe("schema", () => {
  it("accepts a valid spec", () => {
    expect(EventSpecSchema.safeParse(engagement).success).toBe(true);
  });
  it("rejects a template from another event type", () => {
    const r = EventSpecSchema.safeParse({ ...engagement, templateId: "bday-playful" });
    expect(r.success).toBe(false);
  });
  it("requires Hindi wording for bilingual specs", () => {
    expect(EventSpecSchema.safeParse({ ...engagement, language: "both" }).success).toBe(false);
  });
  it("rejects impossible dates and empty names", () => {
    expect(EventSpecSchema.safeParse({ ...engagement, date: "2026-02-30" }).success).toBe(false);
    expect(EventSpecSchema.safeParse({ ...engagement, brideName: "  " }).success).toBe(false);
  });
  it("produces a provider-friendly JSON schema", () => {
    const js = toLlmJsonSchema(EventDraftSchema) as any;
    expect(js.type).toBe("object");
    expect(js.additionalProperties).toBe(false);
    expect(js.required).toEqual(Object.keys(js.properties));
    expect(JSON.stringify(js)).not.toMatch(/minLength|"pattern"|\$schema/);
  });
});

describe("format + slug", () => {
  it("formats display dates in English and Hindi", () => {
    expect(formatDisplayDate("2026-03-15", "en")).toBe("Sunday, 15 March 2026");
    expect(formatDisplayDate("2026-03-15", "hi")).toBe("रविवार, 15 मार्च 2026");
  });
  it("slugifies client names", () => {
    expect(slugify("Rahul & Priya")).toBe("rahul-priya");
    expect(slugify("Sunita Verma")).toBe("sunita-verma");
    expect(slugify("José and Zoë")).toBe("jose-zoe");
    expect(slugify("राहुल और प्रिया")).toBe("rahul-priya");
    expect(slugify("🎉")).toBe("client");
  });
  it("transliterates Devanagari", () => {
    expect(transliterateDevanagari("अमित")).toBe("amit");
    expect(transliterateDevanagari("पूजा")).toBe("puja");
  });
  it("orders couple names groom first", () => {
    expect(clientDisplayName(engagement)).toBe("Rahul & Priya");
  });
});

describe("security", () => {
  it("hashes and verifies passwords", () => {
    const h = hashPassword("s3cret!");
    expect(verifyPassword("s3cret!", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });
  it("signs tokens, rejects tampering, expiry and purpose mix-ups", () => {
    const t = signToken({ k: "a" }, { secret: SECRET, purpose: "file", expiresAt: Date.now() + 60_000 });
    expect(verifyToken(t, { secret: SECRET, purpose: "file" })?.k).toBe("a");
    expect(verifyToken(t, { secret: SECRET, purpose: "session" })).toBeNull();
    expect(verifyToken(t.slice(0, -2) + "xx", { secret: SECRET, purpose: "file" })).toBeNull();
    expect(verifyToken(t, { secret: SECRET, purpose: "file", now: Date.now() + 120_000 })).toBeNull();
  });
});

describe("LocalDiskStorage", () => {
  const storage = new LocalDiskStorage(path.join(tmp, "storage"), {
    signingSecret: SECRET,
    publicBaseUrl: "https://example.ngrok.app",
    defaultTtlHours: 72,
  });

  it("puts, gets, lists, moves and deletes", async () => {
    await storage.put("staging/o1/raw.txt", "hello");
    await storage.put("staging/o1/uploads/a.jpg", Buffer.from([1, 2, 3]));
    expect((await storage.get("staging/o1/raw.txt")).toString()).toBe("hello");
    expect((await storage.list("staging/o1")).map((o) => o.key)).toEqual(["staging/o1/raw.txt", "staging/o1/uploads/a.jpg"]);
    const dest = clientFolder({ clientSlug: "rahul-priya", date: "2026-11-15", eventType: "engagement", orderId: "o1" });
    await storage.movePrefix("staging/o1", dest);
    expect(await storage.exists(`${dest}/uploads/a.jpg`)).toBe(true);
    expect(fs.existsSync(path.join(tmp, "storage", "staging"))).toBe(false);
    await storage.delete(`${dest}/`);
    expect(await storage.list("clients")).toEqual([]);
  });

  it("rejects path traversal", () => {
    for (const bad of ["../x", "a/../../x", "/etc/passwd", "C:/x", "a\\b", "a/./b", "a//b", ""]) {
      expect(() => normalizeKey(bad), bad).toThrow();
    }
    expect(() => storage.localPath("../outside")).toThrow();
  });

  it("creates and verifies signed URLs", async () => {
    const url = storage.createSignedUrl("clients/x/video.mp4", { downloadName: "Video.mp4" });
    expect(url.startsWith("https://example.ngrok.app/api/files/")).toBe(true);
    const token = url.split("/api/files/")[1];
    // Opaque: the storage key cannot be read from the link.
    expect(Buffer.from(token, "base64url").toString("latin1")).not.toContain("clients/x");
    expect(storage.verifySignedToken(token)).toEqual({ key: "clients/x/video.mp4", downloadName: "Video.mp4" });
    expect(storage.verifySignedToken(token + "x")).toBeNull();
    const expired = storage.createSignedUrl("clients/x/video.mp4", { ttlHours: -1 }).split("/api/files/")[1];
    expect(storage.verifySignedToken(expired)).toBeNull();
  });
});

describe("db + job queue", () => {
  const { db, sqlite } = openDb(path.join(tmp, "test.db"));
  afterAll(() => sqlite.close());

  it("creates orders and logs events", () => {
    const o = repo.createOrder(db, { id: "ord1", rawText: "hi", folderKey: "staging/ord1" });
    expect(o.status).toBe("received");
    repo.logEvent(db, "ord1", "received", "Order created");
    expect(repo.listEvents(db, "ord1")).toHaveLength(1);
    repo.updateOrder(db, "ord1", { status: "parsing" });
    expect(repo.getOrder(db, "ord1")?.status).toBe("parsing");
  });

  it("claims jobs atomically, retries with backoff, then gives up", () => {
    repo.createOrder(db, { id: "ord2", rawText: "hi", folderKey: "staging/ord2" });
    repo.enqueueJob(db, "ord2", "parse");
    expect(repo.claimJob(db, ["render"])).toBeUndefined();
    let job = repo.claimJob(db, ["parse"])!;
    expect(job.status).toBe("running");
    expect(job.attempts).toBe(1);
    expect(repo.claimJob(db, ["parse"])).toBeUndefined();
    expect(repo.failJob(db, job, "boom")).toBe("retry");
    expect(repo.claimJob(db, ["parse"])).toBeUndefined(); // backoff not elapsed
    sqlite.prepare("update jobs set run_after = '2000-01-01T00:00:00.000Z' where order_id = 'ord2'").run();
    job = repo.claimJob(db, ["parse"])!;
    expect(job.attempts).toBe(2);
    expect(repo.failJob(db, job, "boom")).toBe("retry");
    sqlite.prepare("update jobs set run_after = '2000-01-01T00:00:00.000Z' where order_id = 'ord2'").run();
    job = repo.claimJob(db, ["parse"])!;
    expect(repo.failJob(db, job, "boom")).toBe("dead");
    expect(repo.backoffMs(1)).toBeLessThan(repo.backoffMs(2));
  });

  it("requeues jobs left running after a crash", () => {
    repo.createOrder(db, { id: "ord3", rawText: "hi", folderKey: "staging/ord3" });
    repo.enqueueJob(db, "ord3", "render");
    repo.claimJob(db, ["render"]);
    expect(repo.requeueStaleJobs(db)).toBe(1);
    expect(repo.hasPendingJob(db, "ord3", "render")).toBe(true);
  });

  it("cascades deletes to jobs and events", () => {
    repo.deleteOrder(db, "ord3");
    expect(repo.listJobs(db, "ord3")).toEqual([]);
  });
});

describe("decide", () => {
  it("prefers the owner's choice, then unused templates, then least used", () => {
    expect(chooseTemplate({ eventType: "wedding", templateChoice: "wed-floral" })).toBe("wed-floral");
    expect(chooseTemplate({ eventType: "wedding", templateChoice: "bday-elegant" })).toBe("wed-royal");
    expect(chooseTemplate({ eventType: "wedding", usedByClient: ["wed-royal"] })).toBe("wed-floral");
    expect(chooseTemplate({ eventType: "birthday", usageCounts: { "bday-playful": 3, "bday-elegant": 1 } })).toBe("bday-elegant");
  });

  it("never rotates Haldi or Mehndi templates into an ordinary wedding or engagement", () => {
    const plain = ["wed-royal", "wed-floral", "wed-peacock", "wed-midnight"];
    const seen = new Set<string>();
    const used: string[] = [];
    for (let i = 0; i < plain.length; i++) {
      const id = chooseTemplate({ eventType: "wedding", usedByClient: used });
      seen.add(id);
      used.push(id);
    }
    expect([...seen].sort()).toEqual([...plain].sort());
    expect(chooseTemplate({ eventType: "wedding", usedByClient: plain })).toBe("wed-royal");
    expect(chooseTemplate({ eventType: "engagement", ceremony: "haldi" })).toBe("eng-traditional");
  });

  it("rotates within the ceremony's templates, and the owner can still pick one", () => {
    expect(chooseTemplate({ eventType: "wedding", ceremony: "haldi" })).toBe("haldi-marigold");
    expect(chooseTemplate({ eventType: "wedding", ceremony: "haldi", usedByClient: ["haldi-marigold"] })).toBe("haldi-glow");
    expect(chooseTemplate({ eventType: "wedding", ceremony: "mehndi", usageCounts: { "mehndi-henna": 4 } })).toBe("mehndi-paisley");
    expect(chooseTemplate({ eventType: "wedding", templateChoice: "mehndi-henna" })).toBe("mehndi-henna");
  });

  it("detects a single-ceremony invitation from its functions or headline", () => {
    const wedding = (over: Record<string, unknown>) =>
      EventSpecSchema.parse({
        eventType: "wedding",
        templateId: "wed-royal",
        language: "en",
        groomName: "A",
        brideName: "B",
        date: "2027-02-04",
        displayDate: "Thursday, 4 February 2027",
        time: "4:00 PM",
        venueName: "Hall",
        wording: { headline: "Wedding Invitation", invitation: "Join us.", closing: "Thank you." },
        ...over,
      });
    const fn = (name: string) => ({ name, date: "2027-02-04", displayDate: "Thursday, 4 February 2027" });
    expect(detectCeremony(wedding({ wording: { headline: "Haldi Ceremony", invitation: "x", closing: "y" } }))).toBe("haldi");
    expect(detectCeremony(wedding({ wording: { headline: "मेहंदी की रस्म", invitation: "x", closing: "y" } }))).toBe("mehndi");
    const neutral = { headline: "Join the Celebration", invitation: "x", closing: "y" };
    expect(detectCeremony(wedding({ wording: neutral, functions: [fn("Mehendi")] }))).toBe("mehndi");
    expect(detectCeremony(wedding({ wording: neutral, functions: [fn("Haldi"), fn("हल्दी")] }))).toBe("haldi");
    expect(detectCeremony(wedding({ wording: neutral, functions: [fn("Haldi"), fn("Mehendi"), fn("Pheras")] }))).toBeNull();
    expect(detectCeremony(wedding({ functions: [fn("Haldi")] }))).toBeNull(); // "Wedding Invitation" headline wins
    expect(detectCeremony(wedding({ wording: { headline: "Haldi & Mehndi", invitation: "x", closing: "y" } }))).toBeNull();
    expect(detectCeremony(wedding({}))).toBeNull();
    expect(detectCeremony(engagement)).toBeNull();
  });
});

describe("json patch + revise", () => {
  it("applies add/replace/remove and blocks prototype pollution", () => {
    const out = applyPatch(engagement, [
      { op: "replace", path: "/time", value: "8:00 PM" },
      { op: "add", path: "/palette", value: { primary: "#d4af37", secondary: "#7a0e1f", accent: "#ffcf70", background: "#3b0612", text: "#fbe8c0" } },
      { op: "remove", path: "/venueName" },
    ]);
    expect(out.time).toBe("8:00 PM");
    expect(out.palette?.primary).toBe("#d4af37");
    expect("venueName" in out).toBe(false);
    expect(engagement.time).toBe("7:00 PM"); // original untouched
    expect(() => applyPatch(engagement, [{ op: "add", path: "/__proto__/x", value: 1 }])).toThrow(PatchError);
  });

  it("revises a spec through the LLM and re-validates", async () => {
    const llm = new MockProvider(() => ({
      operations: [{ op: "replace", path: "/time", valueJson: '"8:00 PM"' }],
      summary: "Time changed",
    }));
    const r = await reviseSpec(llm, engagement, "change time to 8 PM", "2026-10-03");
    expect(r.spec.time).toBe("8:00 PM");
    expect(r.spec.venueName).toBe("Hotel Raj Palace");
  });

  it("retries a revision that breaks validation", async () => {
    let n = 0;
    const llm = new MockProvider(() =>
      ++n === 1
        ? { operations: [{ op: "remove", path: "/brideName", valueJson: null }], summary: "bad" }
        : { operations: [{ op: "replace", path: "/venueName", valueJson: '"Clarks Amer"' }], summary: "ok" },
    );
    const r = await reviseSpec(llm, engagement, "venue is Clarks Amer", "2026-10-03");
    expect(n).toBe(2);
    expect(r.spec.venueName).toBe("Clarks Amer");
  });
});
