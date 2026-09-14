import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  // Rate limit: 20 req/min per IP+user (admin comment moderation).
  const user = await getSessionUser();
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user?.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 20, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });
  // Admin role guard — reject non-admin users.
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { commentId } = await params;
  if (!commentId) {
    return NextResponse.json({ ok: false, error: "Comment id required." }, { status: 422 });
  }
  try {
    // Delete the comment and its associated reports in a transaction
    await db.$transaction([
      db.commentReport.deleteMany({ where: { commentId } }),
      db.comment.delete({ where: { id: commentId } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[/api/admin/comments DELETE] error");
    return NextResponse.json(
      { ok: false, error: "Failed to delete comment." },
      { status: 500 }
    );
  }
}
