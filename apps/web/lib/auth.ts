import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, loginAttempts } from "@invite/shared/db";
import { config } from "@invite/shared/env";
import { hashPassword, verifyPassword } from "@invite/shared/security";
import { SESSION_COOKIE, SESSION_DAYS, isValidSession } from "./session-check";

export { SESSION_COOKIE, configProblem, createSessionToken, isValidSession } from "./session-check";

const g = globalThis as unknown as { __adminHash?: string };

/** The owner's password hash: ADMIN_PASSWORD_HASH, or ADMIN_PASSWORD hashed once in memory. */
export function adminHash(): string | null {
  if (config.adminPasswordHash) return config.adminPasswordHash;
  if (!config.adminPassword) return null;
  g.__adminHash ??= hashPassword(config.adminPassword);
  return g.__adminHash;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 86400,
  // ngrok serves HTTPS; plain http is only localhost during development.
  secure: config.publicBaseUrl.startsWith("https://"),
};

export async function hasSession(): Promise<boolean> {
  return isValidSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** For pages: redirect to /login when signed out. */
export async function requirePageSession(): Promise<void> {
  if (!(await hasSession())) redirect("/login");
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * For API routes: valid session required, and mutating requests must come from
 * our own origin (defence in depth on top of SameSite=Lax cookies).
 */
export async function requireApiSession(req: Request): Promise<void> {
  if (!(await hasSession())) throw new HttpError(401, "Please sign in again");
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Cross-site request blocked");
  }
}

// ------------------------------------------------------------------ login rate limiting

const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const GLOBAL_KEY = "__global__";
const GLOBAL_MAX = 30; // across all IPs per window: slows down distributed guessing

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

function bucket(key: string, now: number) {
  const db = getDb();
  const row = db.select().from(loginAttempts).where(eq(loginAttempts.key, key)).get();
  if (!row || now - row.windowStart > WINDOW_MS) return { db, count: 0, windowStart: now, lockedUntil: row?.lockedUntil ?? 0 };
  return { db, count: row.count, windowStart: row.windowStart, lockedUntil: row.lockedUntil };
}

/** Returns seconds to wait, or 0 when a login attempt is allowed. */
export function loginBlockedFor(ip: string, now = Date.now()): number {
  const local = bucket(ip, now);
  const global = bucket(GLOBAL_KEY, now);
  const until = Math.max(local.lockedUntil, global.lockedUntil);
  return until > now ? Math.ceil((until - now) / 1000) : 0;
}

export function recordLoginFailure(ip: string, now = Date.now()): void {
  for (const [key, max] of [
    [ip, MAX_FAILURES],
    [GLOBAL_KEY, GLOBAL_MAX],
  ] as const) {
    const b = bucket(key, now);
    const count = b.count + 1;
    const lockedUntil = count >= max ? now + LOCK_MS : b.lockedUntil;
    b.db
      .insert(loginAttempts)
      .values({ key, count, windowStart: b.windowStart, lockedUntil })
      .onConflictDoUpdate({ target: loginAttempts.key, set: { count, windowStart: b.windowStart, lockedUntil } })
      .run();
  }
}

export function clearLoginFailures(ip: string): void {
  getDb().delete(loginAttempts).where(eq(loginAttempts.key, ip)).run();
}

export function checkPassword(password: string): boolean {
  const hash = adminHash();
  return !!hash && typeof password === "string" && password.length <= 200 && verifyPassword(password, hash);
}
