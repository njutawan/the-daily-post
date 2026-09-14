import { NextRequest, NextResponse } from "next/server";
import { getLibraryDocs } from "@/lib/context7";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ libraryId: string[] }> };

/**
 * GET /api/docs/[...libraryId]?topic=<topic>&tokens=<n>
 *
 * Fetch documentation for a specific Context7 library ID (e.g.
 * `/vercel/next.js`, `/prisma/prisma`, `/tailwindlabs/tailwindcss`).
 *
 * The `libraryId` is a catch-all param because Context7 IDs contain
 * a `/` (e.g. `/vercel/next.js` → segments `["vercel", "next.js"]`).
 * We reconstruct it by joining with `/` and prepending the leading `/`.
 *
 * Optional query params:
 *   topic  — focus the docs on a topic (e.g. "middleware", "server actions")
 *   tokens — max tokens of docs to return (default 10000, max 50000)
 *
 * Open to any signed-in user. Rate-limited to 20 doc-fetches per minute
 * (docs are large; we want to be conservative).
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { libraryId: segments } = await ctx.params;
  // Reconstruct the Context7 library ID from the path segments.
  // e.g. ["vercel", "next.js"] → "/vercel/next.js"
  const libraryId = "/" + segments.join("/");

  const url = req.nextUrl;
  const topic = url.searchParams.get("topic") || undefined;
  const tokensParam = parseInt(url.searchParams.get("tokens") || "10000", 10);

  const result = await getLibraryDocs(libraryId, topic, tokensParam);
  if (!result) {
    return NextResponse.json(
      { error: "Documentation not available for this library. Try a different library ID or check the Context7 dashboard." },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
