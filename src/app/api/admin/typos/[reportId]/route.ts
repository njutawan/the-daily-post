import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "applied", "dismissed"];

// PATCH updates the status of a typo report (pending | applied | dismissed)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  // Rate limit: 20 req/min per IP+user (admin typo moderation).
  const user = await getSessionUser();
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user?.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 20, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });
  // Admin role guard — reject non-admin users.
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { reportId } = await params;
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "Report id required." }, { status: 422 });
  }

  let body: { status?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : "";
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { ok: false, error: "Invalid status. Use pending, applied, or dismissed." },
      { status: 422 }
    );
  }

  try {
    const updated = await db.typoReport.update({
      where: { id: reportId },
      data: { status },
    });
    return NextResponse.json({ ok: true, report: updated });
  } catch (err) {
    logger.error({ err }, "[/api/admin/typos PATCH] error");
    return NextResponse.json(
      { ok: false, error: "Failed to update typo report." },
      { status: 500 }
    );
  }
}

// DELETE hard-deletes a typo report
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  // Rate limit: 20 req/min per IP+user (admin typo moderation).
  const user = await getSessionUser();
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user?.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 20, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });
  // Admin role guard — reject non-admin users.
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { reportId } = await params;
  if (!reportId) {
    return NextResponse.json({ ok: false, error: "Report id required." }, { status: 422 });
  }
  try {
    await db.typoReport.delete({ where: { id: reportId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[/api/admin/typos DELETE] error");
    return NextResponse.json(
      { ok: false, error: "Failed to delete typo report." },
      { status: 500 }
    );
  }
}
