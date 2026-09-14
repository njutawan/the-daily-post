import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { verifyOrigin } from "@/lib/security";

/**
 * Route protection proxy (Next.js 16 successor to middleware.ts).
 *
 * Wraps Clerk's `clerkMiddleware` so that server-side `auth()` and
 * `currentUser()` (used by `getSessionUser()`) resolve the active
 * Clerk session on every request. Without this wrapper, Clerk's
 * server helpers throw and `getSessionUser()` always returns null.
 *
 * Protected pages (`/admin`, `/editorial`, `/member`) render Clerk's
 * `<SignIn>` component inline when the user is not authenticated —
 * this proxy no longer redirects to a login page. The actual
 * session/role check happens in each page component via
 * `getSessionUser()`.
 *
 * This proxy also enforces CSRF protection on all state-changing
 * API requests (POST/PATCH/PUT/DELETE).
 */
export const proxy = clerkMiddleware((_auth, req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // ── CSRF protection for state-changing API requests ──
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(method) &&
    !pathname.endsWith("/webhook")
  ) {
    if (!verifyOrigin(req, { skipWebhook: true })) {
      return NextResponse.json(
        { error: "Request blocked: invalid origin (CSRF protection)" },
        { status: 403 }
      );
    }
  }

  // Let everything else through — protected pages render <ClerkSignIn>
  // inline when getSessionUser() returns null.
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
