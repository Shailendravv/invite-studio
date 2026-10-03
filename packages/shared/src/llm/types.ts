import { z } from "zod";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: "image/png" | "image/jpeg"; base64: string };

export interface JsonRequest {
  system: string;
  content: ContentPart[];
  /** JSON Schema of the expected output (see toLlmJsonSchema). */
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsImages: boolean;
  /** Returns the parsed JSON object produced by the model (not yet validated). */
  generateJson(req: JsonRequest): Promise<unknown>;
}

export class LLMError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

const UNSUPPORTED_KEYS = new Set([
  "$schema",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "minItems",
  "maxItems",
  "default",
]);

/**
 * Converts a zod schema to a JSON Schema that every provider's structured-output
 * mode accepts: no numeric/string constraints, additionalProperties:false and
 * every property listed as required (optional values are expressed as nullable).
 * Constraints are still enforced afterwards by zod.
 */
export function toLlmJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { target: "draft-7", unrepresentable: "any" }) as Record<string, unknown>;
  const clean = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(clean);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (UNSUPPORTED_KEYS.has(k)) continue;
      out[k] = clean(v);
    }
    if (out.type === "object" && out.properties && typeof out.properties === "object") {
      out.additionalProperties = false;
      out.required = Object.keys(out.properties as object);
    }
    return out;
  };
  return clean(raw) as Record<string, unknown>;
}

/** Extracts the first JSON object from model text (tolerates ```json fences). */
export function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenced ? fenced[1] : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      throw new LLMError(`Model did not return valid JSON: ${trimmed.slice(0, 200)}`, true);
    }
  }
}
