import { afterEach, describe, expect, it, vi } from "vitest";
import { sendNotification } from "../src/notify";

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
});

describe("sendNotification", () => {
  it("is a no-op when NOTIFY_PROVIDER is empty", async () => {
    process.env.NOTIFY_PROVIDER = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendNotification("t", "m")).toBe("disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to ntfy with a click link and encodes non-ASCII titles", async () => {
    process.env.NOTIFY_PROVIDER = "ntfy";
    process.env.NTFY_TOPIC = "my-topic";
    process.env.NTFY_SERVER = "https://ntfy.example";
    const fetchMock = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    await sendNotification("Vidéo ready", "Video ready: Rahul & Priya Engagement", "https://x.ngrok.app/api/files/abc");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://ntfy.example/my-topic");
    expect(init.headers.Click).toBe("https://x.ngrok.app/api/files/abc");
    expect(init.headers.Title).toMatch(/^=\?UTF-8\?B\?/);
    expect(String(init.body)).toContain("Rahul & Priya");
  });

  it("sends a Telegram message", async () => {
    process.env.NOTIFY_PROVIDER = "telegram";
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_CHAT_ID = "42";
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await sendNotification("Video ready", "Video ready: Aarav Birthday", "https://link");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(JSON.parse(String(init.body))).toMatchObject({ chat_id: "42" });
  });

  it("raises on provider errors so the job is retried", async () => {
    process.env.NOTIFY_PROVIDER = "ntfy";
    process.env.NTFY_TOPIC = "t";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(sendNotification("a", "b")).rejects.toThrow(/500/);
  });
});
