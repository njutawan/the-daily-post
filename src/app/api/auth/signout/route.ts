import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * POST /api/auth/signout — no-op now that Clerk handles sign-out.
 *
 * With Clerk configured, sign-out is performed client-side via
 * Clerk's `signOut()` (exposed through `clerkBridge` in
 * unified-auth-provider). This route remains for backward
 * compatibility but performs no work.
 */
export async function POST(req: Request) {
  // Rate limit: 10 req/min per IP (sign out).
  const limited = rateLimitResponse(req, { max: 10, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  return NextResponse.json({ ok: true });
}
