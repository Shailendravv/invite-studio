import type { LLMProvider } from "../llm/types";
import { toLlmJsonSchema } from "../llm/types";
import { QaResultSchema, type QaResult } from "../schema";
import { QA_SYSTEM_PROMPT } from "./prompts";

export interface QaStill {
  label: string;
  /** Text that must be visible in this still. */
  expected: string[];
  pngBase64: string;
}

const qaJsonSchema = toLlmJsonSchema(QaResultSchema);

/** Step D: asks a vision-capable model to proof-read rendered stills. Never blocks delivery. */
export async function runVisualQa(llm: LLMProvider, stills: QaStill[]): Promise<QaResult | null> {
  if (!llm.supportsImages || stills.length === 0) return null;
  const content = stills.flatMap((s, i) => [
    { type: "text" as const, text: `Image ${i + 1} (${s.label}). Expected text: ${s.expected.map((e) => `"${e}"`).join(", ")}` },
    { type: "image" as const, mediaType: "image/png" as const, base64: s.pngBase64 },
  ]);
  const output = await llm.generateJson({ system: QA_SYSTEM_PROMPT, content, schema: qaJsonSchema, schemaName: "qa_result", maxTokens: 2000 });
  const parsed = QaResultSchema.safeParse(output);
  return parsed.success ? parsed.data : { ok: false, issues: ["QA model returned an unreadable answer"] };
}
