// Optimistic auth gate for pages. API routes check the session themselves too.
import { NextResponse, type NextRequest } from "next/server";
import { isValidSession, SESSION_COOKIE } from "./lib/session-check";

export function proxy(request: NextRequest) {
  if (isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Public: login, signed file links, PWA assets and Next internals.
  matcher: ["/((?!login|api/auth/login|api/files/|_next/|icons/|manifest.webmanifest|sw.js|favicon.ico|robots.txt).*)"],
};
