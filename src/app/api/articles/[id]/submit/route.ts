import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/articles/[id]/submit — move a draft article to pending_review.
 * Editors submit articles; admin reviews them.
 *
 * Validation:
 *  - User must be an editor or admin.
 *  - Article must exist and belong to the editor (admins can submit any).
 *  - Article must be in draft or rejected status (re-submit after fixes).
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const user = await requireRole("editor" as Role, "admin" as Role);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 20 submissions per minute per editor (prevent spam-submit).
  const limit = rateLimit(req, { max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const article = await db.article.findUnique({ where: { id } });
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (user.role === "editor" && article.authorId !== user.id) {
      return NextResponse.json(
        { error: "You can only submit your own articles" },
        { status: 403 }
      );
    }

    if (article.status !== "draft" && article.status !== "rejected") {
      return NextResponse.json(
        { error: `Cannot submit an article in "${article.status}" status. Only drafts or rejected articles can be submitted.` },
        { status: 400 }
      );
    }

    // Basic content check — title + body required.
    if (!article.title || article.title.length < 3) {
      return NextResponse.json({ error: "Article must have a title" }, { status: 400 });
    }
    if (!article.body || article.body.trim().length < 50) {
      return NextResponse.json(
        { error: "Article body must be at least 50 characters before submission" },
        { status: 400 }
      );
    }

    const updated = await db.article.update({
      where: { id },
      data: {
        status: "pending_review",
        reviewNotes: null,
        reviewerId: null,
      },
    });

    return NextResponse.json({ article: updated });
  } catch (err) {
    logger.error({ err, articleId: id, userId: user.id }, "[api/articles/[id]/submit] failed");
    return NextResponse.json({ error: "Failed to submit article" }, { status: 500 });
  }
}
