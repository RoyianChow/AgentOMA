import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * OPTIMISTIC UX GATE ONLY — THIS FILE PERFORMS NO AUTHORIZATION.
 *
 * All it checks is that a session COOKIE exists, so a signed-out visitor gets
 * a fast redirect to /sign-in instead of a flash of empty portal. It does not
 * (and cannot cheaply) verify the session against the database, check TOTP
 * enrollment, or check roles — and a crafted request can skip the proxy
 * entirely.
 *
 * The actual security boundary is requirePortalUser() inside EVERY server
 * action and requirePortalPage() in the portal pages (src/lib/auth-guard.ts):
 * session re-verified server-side, TOTP enrollment mandatory, role and
 * pharmacy checked per action. Nothing may rely on this proxy for protection.
 *
 * (Next.js 16 renamed `middleware` → `proxy`; same mechanism.)
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signIn = new URL("/sign-in", request.url);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/pharmacist/:path*"],
};
