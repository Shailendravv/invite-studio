import { containsDevanagari, defaultWording, formatDisplayDate } from "../format";
import type { LLMProvider } from "../llm/types";
import { LLMError, toLlmJsonSchema } from "../llm/types";
import {
  EventDraftSchema,
  EventSpecSchema,
  IsoDateSchema,
  PaletteSchema,
  REQUIRED_FIELDS,
  formatIssues,
  type EventDraft,
  type EventSpec,
} from "../schema";
import { templatesFor, type EventType } from "../templates";
import { PARSE_SYSTEM_PROMPT, parseUserPrompt } from "./prompts";
import { buildClientQuestion } from "./question";

export interface ParseInput {
  rawText: string;
  /** Local date YYYY-MM-DD used to resolve "next Sunday", "15 tarikh"... */
  today: string;
  templateChoice?: string | null;
  photos?: string[];
  audio?: { file: string; durationSec?: number } | null;
}

export type ParseOutcome =
  | { status: "ready"; spec: EventSpec; draft: EventDraft; warnings: string[] }
  | {
      status: "needs_info";
      eventType: EventType | null;
      missing: string[];
      clientQuestion: string;
      /** Whatever could be extracted, for the owner's form. */
      partial: Record<string, unknown>;
      draft: EventDraft;
      warnings: string[];
    };

export class ParseError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayOf(isoDate: string): string {
  return WEEKDAYS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

/** Today's date on this machine (the owner's timezone). */
export function todayLocal(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const draftJsonSchema = toLlmJsonSchema(EventDraftSchema);

/** Calls the LLM and validates the draft; one retry with the errors fed back. */
export async function requestDraft(llm: LLMProvider, rawText: string, today: string, initialFeedback = ""): Promise<EventDraft> {
  const user = parseUserPrompt(rawText, today, weekdayOf(today));
  let feedback = initialFeedback;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let output: unknown;
    try {
      output = await llm.generateJson({
        system: PARSE_SYSTEM_PROMPT,
        content: [{ type: "text", text: user + feedback }],
        schema: draftJsonSchema,
        schemaName: "event_draft",
      });
    } catch (e) {
      if (e instanceof LLMError) throw new ParseError(e.message, e.retryable);
      throw e;
    }
    const result = EventDraftSchema.safeParse(output);
    if (result.success) return result.data;
    lastError = formatIssues(result.error);
    feedback = `\n\nYour previous answer did not match the schema:\n<validation_errors>\n${lastError}\n</validation_errors>\nReturn the corrected JSON.`;
  }
  throw new ParseError(`LLM output failed validation twice:\n${lastError}`, false);
}

const clean = (v: string | null | undefined): string | undefined => {
  const t = typeof v === "string" ? v.trim() : "";
  return t && !/^(null|n\/a|na|unknown|none|-)$/i.test(t) ? t : undefined;
};

const simplify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Guard against invented values: at least one significant word of the value
 * must occur in the client's text. Skipped when the text is in Devanagari,
 * because the model may legitimately transliterate names.
 */
export function appearsInText(value: string, rawText: string): boolean {
  if (containsDevanagari(rawText) || containsDevanagari(value)) return true;
  const raw = simplify(rawText).replace(/[^a-z0-9]+/g, " ");
  const words = simplify(value)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !["the", "and", "hotel", "hall", "mr", "mrs", "shri", "smt"].includes(w));
  if (words.length === 0) return true;
  return words.some((w) => raw.includes(w) || (w.length >= 5 && raw.includes(w.slice(0, 4))));
}

/** Pure post-processing of a draft: guards, defaults, missing fields, spec assembly. */
export function processDraft(draft: EventDraft, input: ParseInput): ParseOutcome {
  const warnings: string[] = [];
  const eventType = draft.eventType;
  const language = draft.language;
  const primaryLang = language === "hi" ? "hi" : "en";

  const guarded = (field: string, value: string | undefined): string | undefined => {
    if (value && !appearsInText(value, input.rawText)) {
      warnings.push(`Ignored ${field} "${value}": it does not appear in the client's message`);
      return undefined;
    }
    return value;
  };

  const personName = guarded("personName", clean(draft.personName));
  const brideName = guarded("brideName", clean(draft.brideName));
  const groomName = guarded("groomName", clean(draft.groomName));
  let venueName = guarded("venueName", clean(draft.venueName));
  let date = clean(draft.date);
  let time = clean(draft.time);
  let venueAddress = clean(draft.venueAddress);

  if (date && !IsoDateSchema.safeParse(date).success) {
    warnings.push(`Ignored invalid date "${date}"`);
    date = undefined;
  }

  const functions = (draft.functions ?? [])
    .map((f) => {
      const fdate = clean(f.date);
      return {
        name: clean(f.name) ?? "",
        date: fdate && IsoDateSchema.safeParse(fdate).success ? fdate : undefined,
        displayDate: clean(f.displayDate),
        time: clean(f.time),
        venueName: clean(f.venueName),
        venueAddress: clean(f.venueAddress),
      };
    })
    .filter((f) => f.name && f.date)
    .map((f) => ({ ...f, displayDate: f.displayDate ?? formatDisplayDate(f.date!, primaryLang) })) as {
    name: string;
    date: string;
    displayDate: string;
    time?: string;
    venueName?: string;
    venueAddress?: string;
  }[];

  // A wedding listed only as functions: take the main details from the wedding/pheras function.
  if (eventType === "wedding" && functions.length && (!date || !time || !venueName)) {
    const main =
      functions.find((f) => /phera|shaadi|shadi|wedding|vivah|विवाह|शादी|फेरे|lagan|lagna/i.test(f.name)) ?? functions[functions.length - 1];
    date ??= main.date;
    time ??= main.time;
    if (!venueName && main.venueName) {
      venueName = main.venueName;
      venueAddress ??= main.venueAddress;
    }
  }

  if (date && date < input.today) warnings.push(`The event date ${date} is in the past`);

  const values: Record<string, unknown> = { personName, brideName, groomName, date, time, venueName };
  const missing: string[] = [];
  if (!eventType) missing.push("eventType");
  else for (const f of REQUIRED_FIELDS[eventType]) if (!values[f]) missing.push(f);

  const age = typeof draft.age === "number" && Number.isInteger(draft.age) && draft.age > 0 && draft.age <= 150 ? draft.age : undefined;

  let palette: EventSpec["palette"];
  if (draft.palette) {
    const p = PaletteSchema.safeParse(draft.palette);
    if (p.success) palette = p.data;
    else warnings.push("Ignored palette with invalid colours");
  }

  const wordingOrDefault = (w: EventDraft["wording"] | null, lang: "en" | "hi") => {
    const fallback = eventType ? defaultWording(eventType, lang, { age }) : { headline: "", invitation: "", closing: "" };
    return {
      headline: clean(w?.headline) ?? fallback.headline,
      invitation: clean(w?.invitation) ?? fallback.invitation,
      closing: clean(w?.closing) ?? fallback.closing,
    };
  };

  const partial: Record<string, unknown> = stripUndefined({
    eventType: eventType ?? undefined,
    language,
    date,
    displayDate: clean(draft.displayDate) ?? (date ? formatDisplayDate(date, primaryLang) : undefined),
    time,
    venueName,
    venueAddress,
    rsvp: clean(draft.rsvp),
    blessingLine: clean(draft.blessingLine),
    palette,
    photos: input.photos?.length ? input.photos : undefined,
    audio: input.audio ?? undefined,
    wording: wordingOrDefault(draft.wording, primaryLang),
    wordingHi: language === "both" ? wordingOrDefault(draft.wordingHi, "hi") : undefined,
    ...(eventType === "birthday" ? { personName, age, hostedBy: clean(draft.hostedBy) } : {}),
    ...(eventType === "engagement" || eventType === "wedding"
      ? { brideName, groomName, brideFamily: clean(draft.brideFamily), groomFamily: clean(draft.groomFamily) }
      : {}),
    ...(eventType === "wedding" && functions.length ? { functions } : {}),
  });

  if (missing.length) {
    const llmMissing = new Set(draft.missingFields);
    const sameSet = llmMissing.size === missing.length && missing.every((m) => llmMissing.has(m));
    const clientQuestion =
      sameSet && clean(draft.clientQuestion) ? clean(draft.clientQuestion)! : buildClientQuestion(missing, draft.languageStyle, eventType);
    return { status: "needs_info", eventType, missing, clientQuestion, partial, draft, warnings };
  }

  const candidate = {
    ...partial,
    templateId: input.templateChoice && templatesFor(eventType!).some((t) => t.id === input.templateChoice)
      ? input.templateChoice
      : templatesFor(eventType!)[0].id,
  };
  const result = EventSpecSchema.safeParse(candidate);
  if (!result.success) {
    throw new SpecValidationError(formatIssues(result.error));
  }
  return { status: "ready", spec: result.data, draft, warnings };
}

export class SpecValidationError extends Error {
  constructor(readonly issues: string) {
    super(`Spec failed validation:\n${issues}`);
    this.name = "SpecValidationError";
  }
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * Step A of the pipeline: raw text -> validated spec or a question for the client.
 * The LLM is asked once more (with the validation errors) if the assembled spec is invalid.
 */
export async function parseOrder(llm: LLMProvider, input: ParseInput): Promise<ParseOutcome> {
  let draft = await requestDraft(llm, input.rawText, input.today);
  try {
    return processDraft(draft, input);
  } catch (e) {
    if (!(e instanceof SpecValidationError)) throw e;
    draft = await requestDraft(
      llm,
      input.rawText,
      input.today,
      `\n\nYour previous answer produced an invalid spec:\n<validation_errors>\n${e.issues}\n</validation_errors>\nReturn the corrected JSON.`,
    );
    try {
      return processDraft(draft, input);
    } catch (e2) {
      if (e2 instanceof SpecValidationError) throw new ParseError(e2.message, false);
      throw e2;
    }
  }
}
