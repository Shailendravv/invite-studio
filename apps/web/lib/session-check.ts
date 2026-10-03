// Pure session-token helpers (usable from proxy.ts and route handlers).
import { createHash } from "node:crypto";
import { config } from "@invite/shared/env";
import { signToken, verifyToken } from "@invite/shared/security";

export const SESSION_COOKIE = "is_session";
export const SESSION_DAYS = 30;
const PURPOSE = "session";

/** Changes whenever the password changes, so old sessions stop working. */
function passwordVersion(): string {
  const source = config.adminPasswordHash || config.adminPassword || "";
  return createHash("sha256").update(source).digest("base64url").slice(0, 10);
}

export function configProblem(): string | null {
  if (!config.adminPassword && !config.adminPasswordHash) return "ADMIN_PASSWORD is not set in .env";
  if (!config.signingSecret || config.signingSecret.length < 16) return "SIGNING_SECRET is missing or shorter than 16 characters in .env";
  return null;
}

export function createSessionToken(): string {
  return signToken({ v: passwordVersion() }, { secret: config.signingSecret, purpose: PURPOSE, expiresAt: Date.now() + SESSION_DAYS * 86400_000 });
}

export function isValidSession(token: string | undefined): boolean {
  if (!token || configProblem()) return false;
  const payload = verifyToken<{ v: string }>(token, { secret: config.signingSecret, purpose: PURPOSE });
  return !!payload && payload.v === passwordVersion();
}
