import type { LLMProvider } from "../llm/types";
import { LLMError, toLlmJsonSchema } from "../llm/types";
import { EventSpecSchema, SpecPatchSchema, formatIssues, type EventSpec } from "../schema";
import { PatchError, applyPatch, type PatchOp } from "./json-patch";
import { ParseError } from "./parse";
import { REVISE_SYSTEM_PROMPT, reviseUserPrompt } from "./prompts";

const patchJsonSchema = toLlmJsonSchema(SpecPatchSchema);

export interface RevisionResult {
  spec: EventSpec;
  operations: PatchOp[];
  summary: string;
}

/** The LLM edits only the spec (as a JSON patch); the result is re-validated. One retry with errors. */
export async function reviseSpec(llm: LLMProvider, spec: EventSpec, instruction: string, today: string): Promise<RevisionResult> {
  const user = reviseUserPrompt(JSON.stringify(spec, null, 2), instruction, today);
  let feedback = "";
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    let output: unknown;
    try {
      output = await llm.generateJson({
        system: REVISE_SYSTEM_PROMPT,
        content: [{ type: "text", text: user + feedback }],
        schema: patchJsonSchema,
        schemaName: "spec_patch",
      });
    } catch (e) {
      if (e instanceof LLMError) throw new ParseError(e.message, e.retryable);
      throw e;
    }
    const parsed = SpecPatchSchema.safeParse(output);
    if (!parsed.success) {
      lastError = formatIssues(parsed.error);
    } else {
      try {
        const operations: PatchOp[] = parsed.data.operations.map((o) => ({
          op: o.op,
          path: o.path,
          value: o.op === "remove" ? undefined : JSON.parse(o.valueJson ?? "null"),
        }));
        const next = applyPatch(spec, operations);
        const valid = EventSpecSchema.safeParse(next);
        if (valid.success) return { spec: valid.data, operations, summary: parsed.data.summary };
        lastError = formatIssues(valid.error);
      } catch (e) {
        if (!(e instanceof PatchError) && !(e instanceof SyntaxError)) throw e;
        lastError = (e as Error).message;
      }
    }
    feedback = `\n\nYour previous patch could not be applied:\n<errors>\n${lastError}\n</errors>\nReturn a corrected patch.`;
  }
  throw new ParseError(`Revision failed validation twice:\n${lastError}`, false);
}
