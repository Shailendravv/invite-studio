import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  checkPassword,
  clearLoginFailures,
  clientIp,
  configProblem,
  createSessionToken,
  loginBlockedFor,
  recordLoginFailure,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(req: Request) {
  const problem = configProblem();
  if (problem) return NextResponse.json({ error: `Server not configured: ${problem}` }, { status: 503 });
  const ip = clientIp(req);
  const wait = loginBlockedFor(ip);
  if (wait) return NextResponse.json({ error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} min.` }, { status: 429 });
  let password = "";
  try {
    password = String((await req.json()).password ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!checkPassword(password)) {
    recordLoginFailure(ip);
    // Small delay to slow down guessing.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  clearLoginFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions);
  return res;
}
