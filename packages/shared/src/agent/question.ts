import type { EventType } from "../templates";

export type LanguageStyle = "english" | "hindi" | "hinglish";

const LABELS: Record<string, Record<LanguageStyle, string>> = {
  eventType: { english: "what the occasion is (birthday, engagement or wedding)", hinglish: "kaunsa function hai (birthday, sagai ya shaadi)", hindi: "कौन सा समारोह है (जन्मदिन, सगाई या विवाह)" },
  personName: { english: "the birthday person's name", hinglish: "jiska birthday hai unka naam", hindi: "जिनका जन्मदिन है उनका नाम" },
  brideName: { english: "the bride's name", hinglish: "dulhan ka naam", hindi: "वधू का नाम" },
  groomName: { english: "the groom's name", hinglish: "dulhe ka naam", hindi: "वर का नाम" },
  date: { english: "the date", hinglish: "date (tarikh)", hindi: "तारीख" },
  time: { english: "the time", hinglish: "time (kitne baje)", hindi: "समय" },
  venueName: { english: "the venue name and address", hinglish: "venue ka naam aur address", hindi: "स्थान का नाम और पता" },
};

function joinList(items: string[], style: LanguageStyle): string {
  if (items.length <= 1) return items[0] ?? "";
  const and = style === "english" ? "and" : style === "hindi" ? "और" : "aur";
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;
}

/** Deterministic, WhatsApp-ready question asking only for the missing fields. */
export function buildClientQuestion(missing: string[], style: LanguageStyle, eventType: EventType | null): string {
  const labels = missing.map((f) => LABELS[f]?.[style] ?? f);
  const list = joinList(labels, style);
  const what =
    eventType === "birthday"
      ? { english: "birthday invitation video", hinglish: "birthday invitation video", hindi: "जन्मदिन निमंत्रण वीडियो" }
      : eventType === "engagement"
        ? { english: "engagement invitation video", hinglish: "sagai ka invitation video", hindi: "सगाई निमंत्रण वीडियो" }
        : eventType === "wedding"
          ? { english: "wedding invitation video", hinglish: "shaadi ka invitation video", hindi: "विवाह निमंत्रण वीडियो" }
          : { english: "invitation video", hinglish: "invitation video", hindi: "निमंत्रण वीडियो" };
  switch (style) {
    case "hindi":
      return `नमस्ते! 🙏 जानकारी के लिए धन्यवाद। ${what.hindi} बनाने के लिए कृपया ${list} भी बता दीजिए।`;
    case "hinglish":
      return `Namaste! 🙏 Details ke liye thank you. ${what.hinglish} banane ke liye please ${list} bhi bata dijiye.`;
    default:
      return `Hi! 😊 Thank you for the details. To make your ${what.english}, could you please also share ${list}?`;
  }
}
