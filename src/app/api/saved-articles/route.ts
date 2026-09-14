import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/saved-articles — list of articles saved by the current user.
 * POST /api/saved-articles — save an article for the current user.
 *
 * Accepts either `articleId` (the DB id) OR `slug` (the URL slug). The
 * BookmarkButton uses `slug` because that's what the article page knows.
 *
 * Security: only published articles can be saved (IDOR guard).
 */

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await db.savedArticle.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      article: {
        select: {
          id: true, slug: true, title: true, excerpt: true,
          category: true, publishedAt: true, heroImage: true,
        },
      },
    },
  });

  return NextResponse.json({
    saved: saved.map((s) => ({
      id: s.id,
      articleId: s.articleId,
      createdAt: s.createdAt.toISOString(),
      article: s.article
        ? {
            ...s.article,
            publishedAt: s.article.publishedAt?.toISOString() ?? null,
          }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = rateLimit(req, { max: 30, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  // Accept either articleId (DB id) or slug (URL slug). The
  // BookmarkButton sends slug; some admin flows may send articleId.
  const articleId = typeof body.articleId === "string" ? body.articleId : null;
  const slug = typeof body.slug === "string" ? body.slug : null;

  if (!articleId && !slug) {
    return NextResponse.json(
      { error: "articleId or slug required" },
      { status: 400 }
    );
  }

  // IDOR guard: only published articles can be saved. Resolve the article
  // by id OR slug — both are unique in the schema.
  const article = await db.article.findUnique({
    where: articleId ? { id: articleId } : { slug: slug! },
    select: { id: true, slug: true, status: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  if (article.status !== "published") {
    return NextResponse.json(
      { error: "Only published articles can be saved" },
      { status: 403 }
    );
  }

  try {
    const saved = await db.savedArticle.upsert({
      where: {
        userId_articleId: { userId: user.id, articleId: article.id },
      },
      create: { userId: user.id, articleId: article.id },
      update: {},
    });
    return NextResponse.json({ ok: true, saved }, { status: 201 });
  } catch (err) {
    logger.error({ err, userId: user.id, articleId: article.id }, "[api/saved-articles] POST failed");
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
