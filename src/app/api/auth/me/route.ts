import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/auth/me — returns the current Clerk session user (or null).
 * Called on mount by UnifiedAuthProvider to hydrate the client-side
 * auth context. Uses getSessionUser() which is Clerk-only.
 */
export async function GET(req: Request) {
  // Rate limit: 60 req/min per IP (session check on mount).
  const limited = rateLimitResponse(req, { max: 60, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      ...user,
      // Dates must be serialized to ISO strings for JSON.
      subExpiresAt: user.subExpiresAt ? user.subExpiresAt.toISOString() : null,
    },
  });
}
