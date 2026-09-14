import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const UpsertHistorySchema = z.object({
  articleId: z.string().min(1),
  progress: z.number().min(0).max(100).optional().default(0),
});

/**
 * GET /api/reading-history — current user's reading history.
 * POST /api/reading-history — upsert an entry (article read or progress).
 *
 * Security: only published articles can be tracked in reading history.
 * This prevents IDOR — without this check, a reader could record reads
 * on draft/rejected/pending articles by guessing their IDs.
 */

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const history = await db.readingHistory.findMany({
    where: { userId: user.id },
    orderBy: { lastReadAt: "desc" },
    take: 50,
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
    history: history.map((h) => ({
      id: h.id,
      articleId: h.articleId,
      progress: h.progress,
      lastReadAt: h.lastReadAt.toISOString(),
      article: h.article
        ? {
            ...h.article,
            publishedAt: h.article.publishedAt?.toISOString() ?? null,
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

  // Rate limit: 60 reads/sec per IP (reading progress is high-frequency).
  const limit = rateLimit(req, { max: 60, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpsertHistorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { articleId, progress } = parsed.data;

  // IDOR guard: only published articles can be tracked.
  const article = await db.article.findUnique({
    where: { id: articleId },
    select: { id: true, status: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }
  if (article.status !== "published") {
    return NextResponse.json(
      { error: "Only published articles can be tracked in reading history" },
      { status: 403 }
    );
  }

  try {
    // Upsert with a single query. Use max() so progress never goes
    // backwards on re-reads (a reader who scrolled to 90% then re-opened
    // the article and only scrolled to 20% should keep the 90%).
    //
    // SQLite doesn't support raw SQL in Prisma's upsert `update`, so we
    // fetch the current row first, then decide. This is a read + write
    // race window, but the worst case is a stale progress value on a
    // concurrent read — acceptable for a reading-progress feature.
    const existing = await db.readingHistory.findUnique({
      where: { userId_articleId: { userId: user.id, articleId } },
    });

    const newProgress = existing
      ? Math.max(existing.progress, progress)
      : progress;

    const entry = await db.readingHistory.upsert({
      where: {
        userId_articleId: { userId: user.id, articleId },
      },
      create: {
        userId: user.id,
        articleId,
        progress: newProgress,
        lastReadAt: new Date(),
      },
      update: {
        progress: newProgress,
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ entry });
  } catch (err) {
    logger.error({ err, userId: user.id, articleId }, "[api/reading-history] POST failed");
    return NextResponse.json({ error: "Failed to update history" }, { status: 500 });
  }
}
