import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function hmac(secret: string, purpose: string, data: string): string {
  return createHmac("sha256", secret).update(`${purpose}:${data}`).digest("base64url");
}

function requireSecret(secret: string): void {
  if (!secret || secret.length < 16) throw new Error("SIGNING_SECRET is missing or too short (min 16 chars)");
}

/** Signs a JSON payload with an expiry. `purpose` separates token families (session vs file). */
export function signToken(payload: Record<string, unknown>, opts: { secret: string; purpose: string; expiresAt: number }): string {
  requireSecret(opts.secret);
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(opts.expiresAt / 1000) }));
  return `${body}.${hmac(opts.secret, opts.purpose, body)}`;
}

export function verifyToken<T extends Record<string, unknown>>(
  token: string,
  opts: { secret: string; purpose: string; now?: number },
): (T & { exp: number }) | null {
  requireSecret(opts.secret);
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined) return null;
  const expected = Buffer.from(hmac(opts.secret, opts.purpose, body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp * 1000 < (opts.now ?? Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}

function sealKey(secret: string, purpose: string): Buffer {
  return createHash("sha256").update(`seal:${purpose}:${secret}`).digest();
}

/**
 * Opaque token: the payload is encrypted (AES-256-GCM), so nobody holding a
 * link can read what it points to; GCM's tag also makes it tamper-proof.
 */
export function sealToken(payload: Record<string, unknown>, opts: { secret: string; purpose: string; expiresAt: number }): string {
  requireSecret(opts.secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(opts.secret, opts.purpose), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({ ...payload, exp: Math.floor(opts.expiresAt / 1000) }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url");
}

export function openToken<T extends Record<string, unknown>>(token: string, opts: { secret: string; purpose: string; now?: number }): (T & { exp: number }) | null {
  requireSecret(opts.secret);
  if (!/^[A-Za-z0-9_-]{40,2000}$/.test(token)) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", sealKey(opts.secret, opts.purpose), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(raw.length - 16));
    const json = Buffer.concat([decipher.update(raw.subarray(12, raw.length - 16)), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json);
    if (typeof payload.exp !== "number" || payload.exp * 1000 < (opts.now ?? Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}
