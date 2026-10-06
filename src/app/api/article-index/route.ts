import { NextRequest, NextResponse } from "next/server";
import { getPublicArticleCatalog, searchPublicArticles } from "@/lib/public-articles";
import { toArticleSummary } from "@/lib/article-summary";
import { rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Return article cards/search metadata only. Full article bodies stay server-side. */
export async function GET(request: NextRequest) {
  const limited = await rateLimitResponse(request, { max: 90, windowMs: 60_000 });
  if (limited) return limited;

  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 100);
  const articles = query
    ? (await searchPublicArticles(query)).slice(0, 8)
    : (await getPublicArticleCatalog()).slice(0, 6);

  return NextResponse.json(
    { articles: articles.map(toArticleSummary) },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  );
}
