import type { EventSpec, Language, Wording } from "./schema";
import type { EventType } from "./templates";

const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const HI_DAYS = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const HI_MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

/** "2026-03-15" -> "Sunday, 15 March 2026" (en) or "रविवार, 15 मार्च 2026" (hi). */
export function formatDisplayDate(iso: string, language: Language = "en"): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getUTCDay();
  const date = d.getUTCDate();
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  if (language === "hi") return `${HI_DAYS[day]}, ${date} ${HI_MONTHS[month]} ${year}`;
  return `${EN_DAYS[day]}, ${date} ${EN_MONTHS[month]} ${year}`;
}

/** Display name for the order / client: "Aarav" or "Rahul & Priya" (groom first). */
export function clientDisplayName(spec: Pick<EventSpec, "eventType"> & Record<string, unknown>): string {
  if (spec.eventType === "birthday") return String(spec.personName ?? "").trim();
  const groom = String(spec.groomName ?? "").trim();
  const bride = String(spec.brideName ?? "").trim();
  return [groom, bride].filter(Boolean).join(" & ");
}

export function eventLabel(eventType: EventType | string | null | undefined): string {
  switch (eventType) {
    case "birthday":
      return "Birthday";
    case "engagement":
      return "Engagement";
    case "wedding":
      return "Wedding";
    default:
      return "Event";
  }
}

/** Fallback wording when the LLM didn't provide any (never names people — templates show those). */
export function defaultWording(eventType: EventType, lang: "en" | "hi", ctx: { age?: number | null } = {}): Wording {
  if (lang === "hi") {
    switch (eventType) {
      case "birthday":
        return {
          headline: ctx.age ? `${ctx.age}वाँ जन्मदिन` : "जन्मदिन समारोह",
          invitation: "आप सादर आमंत्रित हैं, कृपया हमारी खुशियों में शामिल हों।",
          closing: "आपकी उपस्थिति हमारे लिए सबसे बड़ा उपहार है।",
        };
      case "engagement":
        return {
          headline: "सगाई समारोह",
          invitation: "हमारे परिवार की खुशियों में शामिल होकर नव-युगल को आशीर्वाद दें।",
          closing: "आपकी उपस्थिति प्रार्थनीय है।",
        };
      case "wedding":
        return {
          headline: "शुभ विवाह",
          invitation: "आप सपरिवार सादर आमंत्रित हैं, कृपया पधारकर नव-दम्पति को आशीर्वाद दें।",
          closing: "आपकी उपस्थिति हमारा सौभाग्य होगी।",
        };
    }
  }
  switch (eventType) {
    case "birthday":
      return {
        headline: ctx.age ? `${ordinal(ctx.age)} Birthday` : "Birthday Celebration",
        invitation: "Join us for an evening of fun, food and celebration!",
        closing: "Your presence is the best gift.",
      };
    case "engagement":
      return {
        headline: "Engagement Ceremony",
        invitation: "Together with their families, we invite you to celebrate their engagement.",
        closing: "We look forward to celebrating with you.",
      };
    case "wedding":
      return {
        headline: "Wedding Invitation",
        invitation: "Together with their families, request the pleasure of your company at their wedding.",
        closing: "Your presence will make our celebration complete.",
      };
  }
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function containsDevanagari(s: string): boolean {
  return /[ऀ-ॿ]/.test(s);
}
