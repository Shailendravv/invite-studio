import fs from "node:fs";
import path from "node:path";

let cachedRoot: string | null = null;

/** Walks up from cwd to the monorepo root (the package.json named "invite-studio"). */
export function repoRoot(): string {
  if (cachedRoot) return cachedRoot;
  if (process.env.INVITE_ROOT) return (cachedRoot = path.resolve(process.env.INVITE_ROOT));
  let dir = process.cwd();
  for (;;) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, "utf8")).name === "invite-studio") return (cachedRoot = dir);
      } catch {
        // unreadable package.json, keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return (cachedRoot = process.cwd());
    dir = parent;
  }
}

let envLoaded = false;

/** Loads the root .env once. Variables already set in the environment win. */
export function loadEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const file = path.join(repoRoot(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function str(name: string, fallback = ""): string {
  loadEnv();
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function num(name: string, fallback: number): number {
  const v = Number(str(name));
  return Number.isFinite(v) && str(name) !== "" ? v : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = str(name).toLowerCase();
  if (!v) return fallback;
  return ["1", "true", "yes", "on"].includes(v);
}

function resolveFromRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(repoRoot(), p);
}

export const config = {
  get databasePath() {
    return resolveFromRoot(str("DATABASE_PATH", "./data/app.db"));
  },
  get storageRoot() {
    return resolveFromRoot(str("STORAGE_ROOT", "./storage"));
  },
  get port() {
    return num("PORT", 3000);
  },
  get signingSecret() {
    return str("SIGNING_SECRET");
  },
  get linkTtlHours() {
    return num("LINK_TTL_HOURS", 72);
  },
  get adminPassword() {
    return str("ADMIN_PASSWORD");
  },
  get adminPasswordHash() {
    return str("ADMIN_PASSWORD_HASH");
  },
  get publicBaseUrl() {
    const explicit = str("PUBLIC_BASE_URL");
    if (explicit) return explicit.replace(/\/+$/, "");
    const domain = str("NGROK_DOMAIN");
    if (domain) return `https://${domain.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
    return `http://localhost:${num("PORT", 3000)}`;
  },
  get llmProvider() {
    return str("LLM_PROVIDER", "anthropic").toLowerCase();
  },
  get llmModel() {
    return str("LLM_MODEL");
  },
  get anthropicApiKey() {
    return str("ANTHROPIC_API_KEY");
  },
  get openaiApiKey() {
    return str("OPENAI_API_KEY");
  },
  get openaiBaseUrl() {
    return str("OPENAI_BASE_URL", "https://api.openai.com/v1").replace(/\/+$/, "");
  },
  get geminiApiKey() {
    return str("GEMINI_API_KEY");
  },
  get ollamaBaseUrl() {
    return str("OLLAMA_BASE_URL", "http://localhost:11434").replace(/\/+$/, "");
  },
  get qaEnabled() {
    return bool("QA_ENABLED", true);
  },
  get notifyProvider() {
    return str("NOTIFY_PROVIDER").toLowerCase();
  },
  get ntfyServer() {
    return str("NTFY_SERVER", "https://ntfy.sh").replace(/\/+$/, "");
  },
  get ntfyTopic() {
    return str("NTFY_TOPIC");
  },
  get telegramBotToken() {
    return str("TELEGRAM_BOT_TOKEN");
  },
  get telegramChatId() {
    return str("TELEGRAM_CHAT_ID");
  },
  get workerPollMs() {
    return num("WORKER_POLL_MS", 2000);
  },
  get parseConcurrency() {
    return num("PARSE_CONCURRENCY", 3);
  },
  get renderConcurrency(): number | null {
    const v = str("RENDER_CONCURRENCY");
    return v ? Number(v) : null;
  },
};
