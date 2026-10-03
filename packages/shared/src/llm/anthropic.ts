import Anthropic from "@anthropic-ai/sdk";
import { LLMError, parseJsonText, type JsonRequest, type LLMProvider } from "./types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly supportsImages = true;
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string = DEFAULT_ANTHROPIC_MODEL,
  ) {
    if (!apiKey) throw new LLMError("ANTHROPIC_API_KEY is not set", false);
    this.client = new Anthropic({ apiKey, maxRetries: 2 });
  }

  async generateJson(req: JsonRequest): Promise<unknown> {
    const content: Anthropic.ContentBlockParam[] = req.content.map((part) =>
      part.type === "text"
        ? { type: "text", text: part.text }
        : { type: "image", source: { type: "base64", media_type: part.mediaType, data: part.base64 } },
    );
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: req.maxTokens ?? 8000,
        system: req.system,
        messages: [{ role: "user", content }],
        output_config: { format: { type: "json_schema", schema: req.schema } },
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
        throw new LLMError(`Anthropic auth failed: ${error.message}`, false);
      }
      if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
        throw new LLMError(`Anthropic rejected the request: ${error.message}`, false);
      }
      if (error instanceof Anthropic.APIError) throw new LLMError(`Anthropic API error ${error.status}: ${error.message}`, true);
      throw new LLMError(`Anthropic request failed: ${(error as Error).message}`, true);
    }
    if (response.stop_reason === "refusal") throw new LLMError("The model declined this request", false);
    if (response.stop_reason === "max_tokens") throw new LLMError("Model output was cut off (max_tokens)", true);
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return parseJsonText(text);
  }
}
