// Non-Anthropic providers, called over plain HTTP so they add no dependencies.
import { LLMError, parseJsonText, type JsonRequest, type LLMProvider } from "./types";

async function postJson(url: string, body: unknown, headers: Record<string, string>, label: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (e) {
    throw new LLMError(`${label} request failed: ${(e as Error).message}`, true);
  }
  const text = await res.text();
  if (!res.ok) {
    const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
    throw new LLMError(`${label} error ${res.status}: ${text.slice(0, 300)}`, retryable);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new LLMError(`${label} returned non-JSON: ${text.slice(0, 200)}`, true);
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";
  readonly supportsImages = true;
  constructor(
    private readonly apiKey: string,
    readonly model = "gpt-4o-mini",
    private readonly baseUrl = "https://api.openai.com/v1",
  ) {}

  async generateJson(req: JsonRequest): Promise<unknown> {
    const content = req.content.map((p) =>
      p.type === "text" ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: `data:${p.mediaType};base64,${p.base64}` } },
    );
    const data = await postJson(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        max_tokens: req.maxTokens ?? 8000,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content },
        ],
        response_format: { type: "json_schema", json_schema: { name: req.schemaName, schema: req.schema, strict: true } },
      },
      this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {},
      "OpenAI",
    );
    const choice = data.choices?.[0];
    if (choice?.message?.refusal) throw new LLMError(`Model refused: ${choice.message.refusal}`, false);
    if (choice?.finish_reason === "length") throw new LLMError("Model output was cut off", true);
    return parseJsonText(String(choice?.message?.content ?? ""));
  }
}

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  readonly supportsImages = true;
  constructor(
    private readonly apiKey: string,
    readonly model = "gemini-2.5-flash",
  ) {
    if (!apiKey) throw new LLMError("GEMINI_API_KEY is not set", false);
  }

  async generateJson(req: JsonRequest): Promise<unknown> {
    const parts = req.content.map((p) => (p.type === "text" ? { text: p.text } : { inlineData: { mimeType: p.mediaType, data: p.base64 } }));
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`,
      {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: req.schema,
          maxOutputTokens: req.maxTokens ?? 8000,
        },
      },
      { "x-goog-api-key": this.apiKey },
      "Gemini",
    );
    const cand = data.candidates?.[0];
    if (!cand) throw new LLMError(`Gemini returned no candidates: ${JSON.stringify(data.promptFeedback ?? {})}`, false);
    if (cand.finishReason === "MAX_TOKENS") throw new LLMError("Model output was cut off", true);
    const text = (cand.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
    return parseJsonText(text);
  }
}

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  readonly supportsImages: boolean;
  constructor(
    readonly model = "llama3.1",
    private readonly baseUrl = "http://localhost:11434",
  ) {
    this.supportsImages = /llava|vision|vl|gemma3|minicpm-v|moondream/i.test(model);
  }

  async generateJson(req: JsonRequest): Promise<unknown> {
    const text = req.content.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("\n\n");
    const images = req.content.filter((p) => p.type === "image").map((p) => (p as { base64: string }).base64);
    const data = await postJson(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        stream: false,
        format: req.schema,
        options: { temperature: 0, num_predict: req.maxTokens ?? 8000 },
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: text, ...(images.length ? { images } : {}) },
        ],
      },
      {},
      "Ollama",
    );
    return parseJsonText(String(data.message?.content ?? ""));
  }
}
