import { NextRequest, NextResponse } from "next/server";
import { getArticleBySlug, type Article } from "@/data/articles";
import { generateOGImage } from "@/lib/og-image";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * GET /api/og/[slug] — generate an Open Graph image for an article.
 *
 * Looks up the article in two places:
 *  1. The static `data/articles.ts` catalog (built-in MDX articles).
 *  2. The database `Article` table (editorial workflow — articles published
 *     via the editor → admin review flow).
 *
 * For DB articles, we map the database shape to the OG Article shape.
 * This is the "OG auto-detect" — the OG image is generated on demand
 * from whatever data the article actually has, no manual upload needed.
 */

interface DbArticleLite {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  publishedAt: Date | null;
  heroImage: string | null;
  heroCaption: string | null;
  authorName: string | null;
  authorByline: string | null;
}

function dbArticleToOGArticle(dbArticle: DbArticleLite): Article {
  const publishedDate = dbArticle.publishedAt ? new Date(dbArticle.publishedAt) : new Date();
  const now = new Date();
  const diffMs = now.getTime() - publishedDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let time: string;
  if (diffHours < 1) time = "just now";
  else if (diffHours < 24) time = `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  else if (diffDays < 7) time = `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  else time = publishedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Estimate read time from body length — we don't have the body in the
  // lite query, so default to 4 min. The full body is fetched only when
  // the article page itself renders.
  const readTime = 4;

  return {
    slug: dbArticle.slug,
    title: dbArticle.title,
    deck: dbArticle.excerpt ?? "",
    category: dbArticle.category,
    author: dbArticle.authorByline ?? dbArticle.authorName ?? "Staff Reporter",
    time,
    publishedAt: publishedDate.toISOString(),
    readTime,
    imageUrl: dbArticle.heroImage ?? "https://z-cdn.chatglm.cn/z-ai/static/news-default.jpg",
    imageCaption: dbArticle.heroCaption ?? undefined,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 60 req/min per IP (OG image gen is cached 24h).
  const limited = rateLimitResponse(req, { max: 60, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const { slug } = await params;

  // 1. Check the static catalog first (fast — no DB hit).
  let article: Article | null = getArticleBySlug(slug) ?? null;

  // 2. Fall back to the database (editorial workflow).
  if (!article) {
    try {
      const dbArticle = await db.article.findUnique({
        where: { slug },
        include: {
          author: { select: { name: true, byline: true } },
        },
      });
      if (dbArticle && dbArticle.status === "published") {
        article = dbArticleToOGArticle({
          slug: dbArticle.slug,
          title: dbArticle.title,
          excerpt: dbArticle.excerpt,
          category: dbArticle.category,
          publishedAt: dbArticle.publishedAt,
          heroImage: dbArticle.heroImage,
          heroCaption: dbArticle.heroCaption,
          authorName: dbArticle.author.name,
          authorByline: dbArticle.author.byline,
        });
      }
    } catch (err) {
      logger.error({ err, slug }, "[/api/og] DB lookup failed");
      // Don't 500 — we just didn't find a DB article.
    }
  }

  if (!article) {
    return NextResponse.json(
      { error: "Article not found" },
      { status: 404 }
    );
  }

  try {
    const png = await generateOGImage(article);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    logger.error({ err, slug }, "[/api/og] generation error");
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
