import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSessionUser } from "@/lib/auth-unified";
import { db } from "@/lib/db";
import { getArticleBySlug } from "@/data/articles";
import { rateLimitResponse } from "@/lib/rate-limit";
import { commentSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A simple list of words to filter from comments (basic moderation)
const BLOCKED_WORDS = ["spam", "casino", "viagra", "porn", "xxx"];

function moderate(text: string): { ok: boolean; reason?: string } {
  const lower = text.toLowerCase();
  for (const w of BLOCKED_WORDS) {
    if (lower.includes(w)) {
      return { ok: false, reason: "Your comment contains disallowed content." };
    }
  }
  return { ok: true };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }
  // Parse pagination params (default: all comments for backwards compat)
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const hasLimit = limitRaw !== null;
  const limit = hasLimit ? Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20)) : undefined;
  const offset = offsetRaw ? Math.max(0, parseInt(offsetRaw, 10) || 0) : 0;

  try {
    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: { articleSlug: slug },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.comment.count({ where: { articleSlug: slug } }),
    ]);
    return NextResponse.json({
      ok: true,
      comments,
      total,
      limit: limit ?? null,
      offset,
      hasMore: hasLimit ? offset + (limit ?? 0) < total : false,
    });
  } catch (err) {
    logger.error({ err }, "[/api/comments GET] error");
    return NextResponse.json(
      { ok: false, error: "Failed to load comments." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 10 comment posts per minute per IP
  const limited = rateLimitResponse(req, { max: 10, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = commentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 422 }
    );
  }

  const { author, body: text, parentId } = parsed.data;
  const safeParentId = parentId || null;

  // Attach userId from session if logged in
  const user = await getSessionUser();
  const userId = user?.id || null;

  const mod = moderate(text);
  if (!mod.ok) {
    return NextResponse.json({ ok: false, error: mod.reason }, { status: 422 });
  }

  try {
    const comment = await db.comment.create({
      data: { articleSlug: slug, author, body: text, parentId: safeParentId, userId },
    });
    // Invalidate the popular + most-read caches — comment count affects the
    // ranking score, so the new comment should be reflected on next render.
    try {
      revalidateTag("popular", "default");
      revalidateTag("most-read", "default");
    } catch {
      // revalidateTag is only available in production ISR; ignore in dev.
    }
    return NextResponse.json({ ok: true, comment }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "[/api/comments POST] error");
    return NextResponse.json(
      { ok: false, error: "Failed to post comment." },
      { status: 500 }
    );
  }
}

const VALID_REPORT_REASONS = ["spam", "harassment", "misinformation", "off-topic", "other"];

// PATCH handles upvote and report actions via ?action= query param.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action"); // "upvote" | "report"

  let body: { commentId?: unknown; reason?: unknown; reporter?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const commentId = typeof body.commentId === "string" ? body.commentId.slice(0, 60) : "";
  if (!commentId) {
    return NextResponse.json({ ok: false, error: "commentId is required." }, { status: 422 });
  }

  try {
    if (action === "upvote") {
      const updated = await db.comment.update({
        where: { id: commentId },
        data: { upvotes: { increment: 1 } },
        select: { id: true, upvotes: true },
      });
      return NextResponse.json({ ok: true, upvotes: updated.upvotes });
    }

    if (action === "report") {
      const reason = typeof body.reason === "string" ? body.reason : "";
      const reporter =
        typeof body.reporter === "string" ? body.reporter.slice(0, 60) : "anonymous";
      if (!VALID_REPORT_REASONS.includes(reason)) {
        return NextResponse.json(
          { ok: false, error: "Please choose a valid reason." },
          { status: 422 }
        );
      }
      const comment = await db.comment.findUnique({ where: { id: commentId } });
      if (!comment) {
        return NextResponse.json({ ok: false, error: "Comment not found." }, { status: 404 });
      }
      const existing = await db.commentReport.findFirst({
        where: { commentId, reporter },
      });
      if (existing) {
        return NextResponse.json(
          { ok: false, error: "You've already reported this comment." },
          { status: 409 }
        );
      }
      await db.commentReport.create({ data: { commentId, reason, reporter } });
      return NextResponse.json(
        { ok: true, message: "Thanks — our team will review this comment." },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action. Use ?action=upvote or ?action=report." },
      { status: 422 }
    );
  } catch (err) {
    logger.error({ err }, "[/api/comments PATCH] error");
    return NextResponse.json(
      { ok: false, error: "Failed to perform action." },
      { status: 500 }
    );
  }
}

const EDIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// PUT edits a comment (within the 5-minute edit window).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }

  let body: { commentId?: unknown; body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const commentId = typeof body.commentId === "string" ? body.commentId.slice(0, 60) : "";
  const newText = typeof body.body === "string" ? body.body.trim().slice(0, 1000) : "";

  if (!commentId) {
    return NextResponse.json({ ok: false, error: "commentId is required." }, { status: 422 });
  }
  if (!newText || newText.length < 2) {
    return NextResponse.json({ ok: false, error: "Please write a comment." }, { status: 422 });
  }

  const mod = moderate(newText);
  if (!mod.ok) {
    return NextResponse.json({ ok: false, error: mod.reason }, { status: 422 });
  }

  try {
    const existing = await db.comment.findUnique({ where: { id: commentId } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Comment not found." }, { status: 404 });
    }
    // Enforce the 5-minute edit window
    if (Date.now() - existing.createdAt.getTime() > EDIT_WINDOW_MS) {
      return NextResponse.json(
        { ok: false, error: "The 5-minute edit window has closed." },
        { status: 403 }
      );
    }
    const updated = await db.comment.update({
      where: { id: commentId },
      data: { body: newText },
    });
    return NextResponse.json({ ok: true, comment: updated });
  } catch (err) {
    logger.error({ err }, "[/api/comments PUT] error");
    return NextResponse.json(
      { ok: false, error: "Failed to edit comment." },
      { status: 500 }
    );
  }
}
