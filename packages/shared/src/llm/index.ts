import { config } from "../env";
import { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "./anthropic";
import { GeminiProvider, OllamaProvider, OpenAIProvider } from "./http-providers";
import { createFixtureMockProvider } from "./mock";
import { LLMError, type LLMProvider } from "./types";

export * from "./types";
export { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "./anthropic";
export { OpenAIProvider, GeminiProvider, OllamaProvider } from "./http-providers";
export { MockProvider, createFixtureMockProvider, extractTagged } from "./mock";

/** Builds the provider selected by LLM_PROVIDER / LLM_MODEL. */
export function createLLM(provider = config.llmProvider, model = config.llmModel): LLMProvider {
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(config.anthropicApiKey, model || DEFAULT_ANTHROPIC_MODEL);
    case "openai":
      return new OpenAIProvider(config.openaiApiKey, model || "gpt-4o-mini", config.openaiBaseUrl);
    case "gemini":
      return new GeminiProvider(config.geminiApiKey, model || "gemini-2.5-flash");
    case "ollama":
      return new OllamaProvider(model || "llama3.1", config.ollamaBaseUrl);
    case "mock":
      return createFixtureMockProvider();
    default:
      throw new LLMError(`Unknown LLM_PROVIDER "${provider}" (use anthropic, openai, gemini, ollama or mock)`, false);
  }
}

let cached: LLMProvider | null = null;
export function getLLM(): LLMProvider {
  return (cached ??= createLLM());
}
export function setLLM(p: LLMProvider | null): void {
  cached = p;
}
