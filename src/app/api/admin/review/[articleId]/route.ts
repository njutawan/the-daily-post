import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const ReviewSchema = z.object({
  // approved → published, rejected → rejected, requested_changes → draft
  action: z.enum(["approved", "rejected", "requested_changes"]),
  notes: z.string().max(2000).optional().default(""),
  featured: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ articleId: string }> };

/**
 * POST /api/admin/review/[articleId] — admin reviews a pending article.
 *
 * - approved: status → published, publishedAt set, reviewerId set.
 * - rejected: status → rejected, reviewNotes set, reviewerId set.
 * - requested_changes: status → draft, reviewNotes set (sent back to editor).
 *
 * Each review is also recorded in the ArticleReview table.
 *
 * Both writes (article update + review audit row) run inside a
 * Prisma transaction so a partial failure can never leave the article
 * in an inconsistent state (e.g. published with no audit trail).
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { articleId } = await ctx.params;
  const user = await requireRole("admin" as Role);
  if (!user) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Rate limit: 30 review actions per minute per admin.
  const limit = rateLimit(req, { max: 30, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { action, notes, featured } = parsed.data;

  try {
    const article = await db.article.findUnique({ where: { id: articleId } });
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (article.status !== "pending_review") {
      return NextResponse.json(
        { error: `Cannot review an article in "${article.status}" status. Only pending_review articles can be reviewed.` },
        { status: 400 }
      );
    }

    const newStatus =
      action === "approved" ? "published" :
      action === "rejected" ? "rejected" :
      "draft";

    // Transaction: update the article AND create the audit row atomically.
    const [updated, review] = await db.$transaction([
      db.article.update({
        where: { id: articleId },
        data: {
          status: newStatus,
          reviewerId: user.id,
          reviewNotes: notes || null,
          publishedAt: action === "approved" ? new Date() : null,
          featured: action === "approved" ? (featured ?? false) : false,
        },
      }),
      db.articleReview.create({
        data: {
          articleId,
          reviewerId: user.id,
          action,
          notes: notes || null,
        },
      }),
    ]);

    return NextResponse.json({ article: updated, review: { action, notes: review.notes } });
  } catch (err) {
    logger.error({ err, articleId, reviewerId: user.id, action }, "[api/admin/review/[id]] POST failed");
    return NextResponse.json({ error: "Failed to review article" }, { status: 500 });
  }
}
