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
 *
 * When Clerk is NOT configured (no CLERK_* keys in the environment —
 * e.g. a fresh clone or an offline sandbox), `clerkMiddleware` would
 * throw "Missing publishableKey" on every request and 500 the whole
 * site. In that case we skip the Clerk wrapper and run the same CSRF
 * handler directly: pages render signed-out (getSessionUser() already
 * returns null when Clerk is unconfigured).
 */
const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

if (!clerkConfigured && process.env.NODE_ENV !== "production") {
  console.warn(
    "[proxy] Clerk keys not set (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY) — " +
      "running without authentication. Sign-in will be unavailable until keys are configured."
  );
}

function handleRequest(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // ── CSRF protection for state-changing API requests ──
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(method)
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
}

export const proxy = clerkConfigured
  ? clerkMiddleware((_auth, req: NextRequest) => handleRequest(req))
  : handleRequest;

export const config = {
  matcher: [
    "/((?!_next|_vercel|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
