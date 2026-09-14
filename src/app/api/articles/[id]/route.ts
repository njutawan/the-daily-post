import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser, requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

const UpdateArticleSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  body: z.string().max(50000).optional(),
  category: z.enum([
    "politics", "world", "business", "tech",
    "opinion", "sports", "climate", "culture",
  ]).optional(),
  tags: z.string().max(200).optional(),
  heroImage: z.string().url().optional().nullable(),
  heroCaption: z.string().max(300).optional().nullable(),
  // Status transitions handled by dedicated endpoints, but admin can
  // override (e.g. archive a published article).
  status: z.enum(["draft", "pending_review", "published", "rejected", "archived"]).optional(),
  featured: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/articles/[id] — fetch a single article.
 * Editors see their own (any status) + published.
 * Admins see everything. Readers see published only.
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 req/min per IP+user (article CRUD).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  try {
    const article = await db.article.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, byline: true } },
        reviewer: { select: { id: true, name: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { id: true, name: true } } },
        },
      },
    });
    if (!article) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Scope check
    if (user.role === "editor" && article.authorId !== user.id && article.status !== "published") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "reader" && article.status !== "published") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (err) {
    logger.error({ err }, "[api/articles/[id]] GET failed");
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 });
  }
}

/**
 * PATCH /api/articles/[id] — update article fields.
 * Editors can update their own drafts/rejected/pending (changes move status back to draft).
 * Admins can update anything including archiving / featuring.
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const user = await requireRole("editor" as Role, "admin" as Role);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 30 req/min per IP+user (article CRUD).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const body = await req.json().catch(() => null);
  const parsed = UpdateArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Editors can only modify their own articles, and only when not published.
    if (user.role === "editor") {
      if (existing.authorId !== user.id) {
        return NextResponse.json({ error: "You can only edit your own articles" }, { status: 403 });
      }
      if (existing.status === "published") {
        // Editors requesting a change to a published article must request changes (move back to draft).
        // We allow it but auto-move to draft.
      }
    }

    // Prevent editors from setting status to published directly.
    if (user.role === "editor" && parsed.data.status === "published") {
      return NextResponse.json(
        { error: "Editors cannot publish directly. Submit for admin review." },
        { status: 403 }
      );
    }

    const update: Record<string, unknown> = { ...parsed.data };
    // If an editor modifies content of a pending_review article, move it back to draft.
    if (user.role === "editor" && existing.status === "pending_review") {
      const contentFields = ["title", "excerpt", "body", "category", "tags", "heroImage", "heroCaption"];
      if (contentFields.some((f) => f in update)) {
        update.status = "draft";
        update.reviewerId = null;
        update.reviewNotes = null;
      }
    }

    const article = await db.article.update({
      where: { id },
      data: update,
    });
    return NextResponse.json({ article });
  } catch (err) {
    logger.error({ err }, "[api/articles/[id]] PATCH failed");
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }
}

/**
 * DELETE /api/articles/[id] — delete a draft/rejected article.
 * Editors can only delete their own unpublished articles.
 * Admins can delete anything.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const user = await requireRole("editor" as Role, "admin" as Role);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 30 req/min per IP+user (article CRUD).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  try {
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (user.role === "editor") {
      if (existing.authorId !== user.id) {
        return NextResponse.json({ error: "You can only delete your own articles" }, { status: 403 });
      }
      if (existing.status === "published") {
        return NextResponse.json(
          { error: "Published articles cannot be deleted. Contact an admin to archive." },
          { status: 403 }
        );
      }
    }

    await db.article.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[api/articles/[id]] DELETE failed");
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }
}
