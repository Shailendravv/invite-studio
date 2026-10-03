import type { EventSpec } from "../schema";
import { getTemplate, templatesFor, type Ceremony, type EventType } from "../templates";

// Latin (incl. Hinglish spellings) and Devanagari. No \b: it does not work for Devanagari.
const CEREMONY_WORDS: Record<Ceremony, RegExp> = {
  haldi: /haldi|halad|pithi|हल्दी|हल्दि|पीठी/i,
  mehndi: /mehnd[ie]|mehend[ie]|mehand[ie]|henna|मेहंदी|मेहन्दी|मेहेंदी/i,
};

const WEDDING_WORDS = /wedding|shaadi|shadi|vivah|विवाह|शादी/i;

function ceremonyIn(text: string): Ceremony | null {
  const hits = (Object.keys(CEREMONY_WORDS) as Ceremony[]).filter((c) => CEREMONY_WORDS[c].test(text));
  return hits.length === 1 ? hits[0] : null;
}

/**
 * The single ceremony an invitation is for, or null for a full wedding (or anything
 * else). The headline decides ("Haldi Ceremony", "मेहंदी की रस्म"). When it names no
 * ceremony and does not say "wedding", the listed functions decide, but only if
 * they are all the same ceremony.
 */
export function detectCeremony(spec: EventSpec): Ceremony | null {
  if (spec.eventType !== "wedding") return null;
  const headline = [spec.wording.headline, spec.wordingHi?.headline].filter(Boolean).join(" ");
  const fromHeadline = ceremonyIn(headline);
  if (fromHeadline) return fromHeadline;
  const functions = spec.functions ?? [];
  if (!functions.length || WEDDING_WORDS.test(headline)) return null;
  const found = new Set(functions.map((f) => ceremonyIn(f.name)));
  return found.size === 1 ? [...found][0] : null;
}

/**
 * Owner's choice wins when it fits the event type. Otherwise rotate: prefer a
 * template this client has not had before, then the least used one overall.
 * Ceremony templates (Haldi, Mehndi) are only in the pool for a matching
 * `ceremony`, and are left out of the rotation for everything else.
 */
export function chooseTemplate(args: {
  eventType: EventType;
  ceremony?: Ceremony | null;
  templateChoice?: string | null;
  usedByClient?: string[];
  usageCounts?: Record<string, number>;
}): string {
  const choice = args.templateChoice ? getTemplate(args.templateChoice) : undefined;
  if (choice && choice.eventType === args.eventType) return choice.id;
  const used = new Set(args.usedByClient ?? []);
  const counts = args.usageCounts ?? {};
  const all = templatesFor(args.eventType);
  const matching = all.filter((t) => t.ceremony === (args.ceremony ?? undefined));
  const pool = matching.length ? matching : all.filter((t) => !t.ceremony);
  const candidates = pool.map((t, i) => ({ id: t.id, i }));
  candidates.sort((a, b) => {
    const usedDiff = Number(used.has(a.id)) - Number(used.has(b.id));
    if (usedDiff) return usedDiff;
    const countDiff = (counts[a.id] ?? 0) - (counts[b.id] ?? 0);
    if (countDiff) return countDiff;
    return a.i - b.i;
  });
  return candidates[0].id;
}
