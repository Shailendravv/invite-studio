import { Readable } from "node:stream";
import { getStorage } from "@invite/shared/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
};

function contentDisposition(name: string, download: boolean): string {
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${download ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/**
 * Public, but only with a valid signed token (HMAC + expiry). Supports HTTP
 * Range requests so videos stream and seek in the browser / WhatsApp preview.
 */
async function serve(req: Request, { params }: Ctx, headOnly: boolean): Promise<Response> {
  const storage = getStorage();
  const { token } = await params;
  const verified = token.length < 2000 ? storage.verifySignedToken(token) : null;
  if (!verified) return new Response("This link is invalid or has expired.", { status: 410, headers: { "content-type": "text/plain" } });
  const stat = await storage.stat(verified.key);
  if (!stat) return new Response("File not found.", { status: 404, headers: { "content-type": "text/plain" } });

  const ext = verified.key.split(".").pop()?.toLowerCase() ?? "";
  const download = new URL(req.url).searchParams.get("download") === "1";
  const name = verified.downloadName ?? verified.key.split("/").pop()!;
  const headers: Record<string, string> = {
    "content-type": TYPES[ext] ?? "application/octet-stream",
    "accept-ranges": "bytes",
    "content-disposition": contentDisposition(name, download),
    "cache-control": "private, max-age=3600",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = range.match(/^bytes=(\d*)-(\d*)$/);
    let start = m && m[1] !== "" ? Number(m[1]) : NaN;
    let end = m && m[2] !== "" ? Number(m[2]) : NaN;
    if (m && m[1] === "" && m[2] !== "") {
      // suffix range: last N bytes
      start = Math.max(0, stat.size - Number(m[2]));
      end = stat.size - 1;
    }
    if (Number.isNaN(end) || end >= stat.size) end = stat.size - 1;
    if (!m || Number.isNaN(start) || start > end || start >= stat.size) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${stat.size}` } });
    }
    headers["content-range"] = `bytes ${start}-${end}/${stat.size}`;
    headers["content-length"] = String(end - start + 1);
    if (headOnly) return new Response(null, { status: 206, headers });
    const body = Readable.toWeb(storage.getStream(verified.key, { start, end })) as ReadableStream;
    return new Response(body, { status: 206, headers });
  }

  headers["content-length"] = String(stat.size);
  if (headOnly) return new Response(null, { status: 200, headers });
  return new Response(Readable.toWeb(storage.getStream(verified.key)) as ReadableStream, { status: 200, headers });
}

export function GET(req: Request, ctx: Ctx) {
  return serve(req, ctx, false);
}

export function HEAD(req: Request, ctx: Ctx) {
  return serve(req, ctx, true);
}
