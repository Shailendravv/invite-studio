import type { EventSpec, Wording } from "@invite/shared/schema";

type Lang = "en" | "hi";

const LABELS = {
  date: { en: "Date", hi: "दिनांक" },
  time: { en: "Time", hi: "समय" },
  venue: { en: "Venue", hi: "स्थान" },
  rsvp: { en: "RSVP", hi: "संपर्क" },
  hostedBy: { en: "Hosted by", hi: "आयोजक" },
  functions: { en: "Celebrations", hi: "कार्यक्रम" },
  weds: { en: "weds", hi: "संग" },
  with: { en: "&", hi: "संग" },
} as const;

export type LabelKey = keyof typeof LABELS;

export function label(spec: Pick<EventSpec, "language">, key: LabelKey): string {
  const l = LABELS[key];
  if (spec.language === "hi") return l.hi;
  if (spec.language === "both") return `${l.en} · ${l.hi}`;
  return l.en;
}

export function primaryLang(spec: Pick<EventSpec, "language">): Lang {
  return spec.language === "hi" ? "hi" : "en";
}

/** Primary wording plus the Hindi line for bilingual specs. */
export function wordingLines(spec: EventSpec, key: keyof Wording): { main: string; secondary?: string } {
  return {
    main: spec.wording[key],
    secondary: spec.language === "both" ? spec.wordingHi?.[key] : undefined,
  };
}

/** "7:00 PM" -> "शाम 7:00 बजे" for Hindi; other languages unchanged. */
export function displayTime(time: string | undefined, spec: Pick<EventSpec, "language">): string {
  if (!time) return "";
  if (spec.language !== "hi") return time;
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/);
  if (!m) return time;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  const part = h >= 4 && h < 12 ? "सुबह" : h >= 12 && h < 16 ? "दोपहर" : h >= 16 && h < 20 ? "शाम" : "रात";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${part} ${h12}${m[2] && m[2] !== "00" ? `:${m[2]}` : ""} बजे`;
}

const HI_ORDINALS: Record<number, string> = { 1: "पहला", 2: "दूसरा", 3: "तीसरा", 4: "चौथा", 6: "छठा" };

export function ordinalEn(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** "5th Birthday" / "5वाँ जन्मदिन" / both. */
export function birthdayLine(age: number | undefined, spec: Pick<EventSpec, "language">): string | undefined {
  if (!age) return undefined;
  const en = `${ordinalEn(age)} Birthday`;
  const hi = `${HI_ORDINALS[age] ?? `${age}वाँ`} जन्मदिन`;
  if (spec.language === "hi") return hi;
  if (spec.language === "both") return `${en} · ${hi}`;
  return en;
}

export function containsDevanagari(s: string | undefined): boolean {
  return !!s && /[ऀ-ॿ]/.test(s);
}
