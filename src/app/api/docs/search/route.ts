import { NextRequest, NextResponse } from "next/server";
import { searchLibraries } from "@/lib/context7";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/docs/search?q=<query>&limit=<n>
 *
 * Search the Context7 index for libraries matching the query.
 * Returns a list of { id, name, description, version, trustScore }.
 *
 * Open to any signed-in user (admin + editor + reader) — looking up
 * library docs is useful for everyone, not just admins.
 *
 * Rate-limited to 30 searches per minute per IP.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { max: 30, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = req.nextUrl;
  const q = url.searchParams.get("q") || "";
  const limitParam = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 20);

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const result = await searchLibraries(q, limitParam);
  return NextResponse.json(result);
}
