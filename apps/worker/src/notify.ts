import { config } from "@invite/shared/env";

/** Push a message to the owner's phone via ntfy or Telegram. No-op when NOTIFY_PROVIDER is empty. */
export async function sendNotification(title: string, message: string, link?: string): Promise<"sent" | "disabled"> {
  const provider = config.notifyProvider;
  if (!provider) return "disabled";
  if (provider === "ntfy") {
    if (!config.ntfyTopic) throw new Error("NTFY_TOPIC is not set");
    const res = await fetch(`${config.ntfyServer}/${encodeURIComponent(config.ntfyTopic)}`, {
      method: "POST",
      body: link ? `${message}\n${link}` : message,
      headers: {
        Title: encodeHeader(title),
        Tags: "movie_camera",
        ...(link ? { Click: link, Actions: `view, Download, ${link}` } : {}),
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`ntfy responded ${res.status}: ${await res.text()}`);
    return "sent";
  }
  if (provider === "telegram") {
    if (!config.telegramBotToken || !config.telegramChatId) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set");
    const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: `${title}\n${message}${link ? `\n${link}` : ""}`,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Telegram responded ${res.status}: ${await res.text()}`);
    return "sent";
  }
  throw new Error(`Unknown NOTIFY_PROVIDER "${provider}" (use ntfy or telegram)`);
}

/** HTTP headers must be Latin-1; ntfy accepts RFC 2047 encoded words for anything else. */
function encodeHeader(v: string): string {
  return /^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;
}
