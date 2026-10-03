// The single source of truth for an invitation. The LLM step, the owner's edit
// form and every Remotion template consume these schemas.
import { z } from "zod";
import { EVENT_TYPES, TEMPLATE_IDS, getTemplate } from "./templates";

export { EVENT_TYPES };
export type { EventType } from "./templates";

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} is required`);

export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Not a real calendar date");

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #aa3322");

export const LanguageSchema = z.enum(["en", "hi", "both"]);
export type Language = z.infer<typeof LanguageSchema>;

export const PaletteSchema = z.object({
  primary: hex,
  secondary: hex,
  accent: hex,
  background: hex,
  text: hex,
});

export const WordingSchema = z.object({
  headline: nonEmpty("Headline").describe("Short title, e.g. 'You're Invited' or 'शुभ विवाह'"),
  invitation: nonEmpty("Invitation sentence").describe("One warm sentence inviting the guest"),
  closing: nonEmpty("Closing line").describe("Short sign-off, e.g. 'Your presence is our blessing'"),
});
export type Wording = z.infer<typeof WordingSchema>;

export const AudioSchema = z.object({
  file: z.string().min(1).describe("File name inside the order's uploads folder"),
  durationSec: z.number().positive().optional(),
});

export const WeddingFunctionSchema = z.object({
  name: nonEmpty("Function name").describe("e.g. Haldi, Mehendi, Sangeet, Pheras"),
  date: IsoDateSchema,
  displayDate: nonEmpty("Display date"),
  time: z.string().optional(),
  venueName: z.string().optional().describe("Leave empty to use the main venue"),
  venueAddress: z.string().optional(),
});
export type WeddingFunction = z.infer<typeof WeddingFunctionSchema>;

const commonFields = {
  language: LanguageSchema,
  date: IsoDateSchema.describe("Main event date"),
  displayDate: nonEmpty("Display date").describe("Human date text shown on screen"),
  time: nonEmpty("Time").describe("e.g. 7:00 PM"),
  venueName: nonEmpty("Venue"),
  venueAddress: z.string().optional(),
  rsvp: z.string().optional().describe("RSVP name / phone"),
  blessingLine: z.string().optional().describe("e.g. 'With the blessings of Lord Ganesha'"),
  templateId: z.enum(TEMPLATE_IDS),
  palette: PaletteSchema.optional(),
  photos: z.array(z.string()).optional().describe("Photo file names inside the order's uploads folder"),
  audio: AudioSchema.optional(),
  wording: WordingSchema.describe("Wording in the primary language (Hindi when language is 'hi')"),
  wordingHi: WordingSchema.optional().describe("Hindi wording, used when language is 'both'"),
};

export const BirthdaySpecSchema = z.object({
  eventType: z.literal("birthday"),
  ...commonFields,
  personName: nonEmpty("Name"),
  age: z.number().int().positive().max(150).optional(),
  hostedBy: z.string().optional(),
});

const coupleFields = {
  brideName: nonEmpty("Bride name"),
  groomName: nonEmpty("Groom name"),
  brideFamily: z.string().optional().describe("e.g. 'D/o Mr & Mrs Sharma'"),
  groomFamily: z.string().optional(),
};

export const EngagementSpecSchema = z.object({
  eventType: z.literal("engagement"),
  ...commonFields,
  ...coupleFields,
});

export const WeddingSpecSchema = z.object({
  eventType: z.literal("wedding"),
  ...commonFields,
  ...coupleFields,
  functions: z.array(WeddingFunctionSchema).optional(),
});

export const EventSpecSchema = z
  .discriminatedUnion("eventType", [BirthdaySpecSchema, EngagementSpecSchema, WeddingSpecSchema])
  .superRefine((spec, ctx) => {
    const t = getTemplate(spec.templateId);
    if (t && t.eventType !== spec.eventType) {
      ctx.addIssue({
        code: "custom",
        path: ["templateId"],
        message: `Template ${spec.templateId} is for ${t.eventType}, not ${spec.eventType}`,
      });
    }
    if (spec.language === "both" && !spec.wordingHi) {
      ctx.addIssue({ code: "custom", path: ["wordingHi"], message: "Hindi wording is required when language is 'both'" });
    }
  });

export type EventSpec = z.infer<typeof EventSpecSchema>;
export type BirthdaySpec = z.infer<typeof BirthdaySpecSchema>;
export type EngagementSpec = z.infer<typeof EngagementSpecSchema>;
export type WeddingSpec = z.infer<typeof WeddingSpecSchema>;

/** Fields that must be present before a video can be rendered. */
export const REQUIRED_FIELDS = {
  birthday: ["personName", "date", "time", "venueName"],
  engagement: ["brideName", "groomName", "date", "time", "venueName"],
  wedding: ["brideName", "groomName", "date", "time", "venueName"],
} as const satisfies Record<(typeof EVENT_TYPES)[number], readonly string[]>;

// ---------------------------------------------------------------------------
// Draft: what the LLM returns. Flat, every key present, unknowns are null.
// This shape is friendly to structured-output modes of every provider.
// ---------------------------------------------------------------------------

const nullableStr = z.string().nullable();

export const DraftFunctionSchema = z.object({
  name: z.string(),
  date: nullableStr.describe("YYYY-MM-DD or null"),
  displayDate: nullableStr,
  time: nullableStr,
  venueName: nullableStr,
  venueAddress: nullableStr,
});

export const DraftWordingSchema = z.object({
  headline: z.string(),
  invitation: z.string(),
  closing: z.string(),
});

export const DraftPaletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  text: z.string(),
});

export const EventDraftSchema = z.object({
  eventType: z.enum(EVENT_TYPES).nullable().describe("null if it cannot be determined"),
  language: LanguageSchema.describe("Language(s) for the invitation text"),
  languageStyle: z
    .enum(["english", "hindi", "hinglish"])
    .describe("How the client writes: English, Hindi (Devanagari) or Hinglish (Hindi in Latin letters)"),
  personName: nullableStr.describe("Birthday person"),
  age: z.number().nullable().describe("Age they are turning, only if stated"),
  hostedBy: nullableStr,
  brideName: nullableStr,
  groomName: nullableStr,
  brideFamily: nullableStr,
  groomFamily: nullableStr,
  date: nullableStr.describe("Main event date as YYYY-MM-DD, or null"),
  displayDate: nullableStr.describe("Date as it should appear on screen, in the invitation language"),
  time: nullableStr.describe("e.g. 7:00 PM, or null"),
  venueName: nullableStr,
  venueAddress: nullableStr,
  rsvp: nullableStr,
  blessingLine: nullableStr,
  functions: z.array(DraftFunctionSchema).describe("Wedding functions such as Haldi, Mehendi, Sangeet, Pheras; [] if none"),
  palette: DraftPaletteSchema.nullable().describe("Hex colours only if the client asked for specific colours, else null"),
  wording: DraftWordingSchema.describe("Invitation wording in the primary language"),
  wordingHi: DraftWordingSchema.nullable().describe("Hindi wording when language is 'both', else null"),
  missingFields: z.array(z.string()).describe("Required fields absent from the message"),
  clientQuestion: nullableStr.describe("Short WhatsApp-ready question asking only for the missing details, or null"),
});
export type EventDraft = z.infer<typeof EventDraftSchema>;

// Revision: the LLM returns a JSON patch against the current spec.
export const SpecPatchSchema = z.object({
  operations: z.array(
    z.object({
      op: z.enum(["add", "replace", "remove"]),
      path: z.string().describe("JSON Pointer, e.g. /time or /palette/primary or /functions/0/time"),
      valueJson: nullableStr.describe("The new value encoded as JSON (e.g. \"\\\"8:00 PM\\\"\"), null for remove"),
    }),
  ),
  summary: z.string().describe("One short sentence describing the change"),
});
export type SpecPatch = z.infer<typeof SpecPatchSchema>;

// Visual QA of rendered stills.
export const QaResultSchema = z.object({
  ok: z.boolean(),
  issues: z.array(z.string()),
});
export type QaResult = z.infer<typeof QaResultSchema>;

/** Formats zod issues as short "path: message" lines (fed back to the LLM on retry). */
export function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}
