import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ commentId: string }> };

/**
 * POST /api/admin/comments/[commentId]/dismiss-reports
 *
 * Dismiss all reports on a comment WITHOUT deleting the comment itself.
 * Used when the admin reviews the report and decides the comment is fine.
 *
 * Admin-only. Rate-limited to 60 actions per minute per admin.
 */
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { commentId } = await ctx.params;
  const admin = await requireRole("admin" as Role);
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const limit = rateLimit(req, { max: 60, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    // Verify the comment exists — return 404 (not a generic 500) if not.
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Delete all reports for this comment.
    const result = await db.commentReport.deleteMany({
      where: { commentId },
    });

    logger.info(
      { commentId, adminId: admin.id, dismissed: result.count },
      "[admin/comments/dismiss] reports dismissed"
    );

    return NextResponse.json({
      ok: true,
      dismissed: result.count,
    });
  } catch (err) {
    logger.error({ err, commentId, adminId: admin.id }, "[admin/comments/dismiss] failed");
    return NextResponse.json({ error: "Failed to dismiss reports" }, { status: 500 });
  }
}
