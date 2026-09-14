import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  // Rate limit: 5 req/min per IP+user (heavy CSV export).
  const user = await getSessionUser();
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user?.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 5, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });
  // Admin role guard — reject non-admin users.
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const subscribers = await db.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: { email: true, source: true, createdAt: true },
    });

    const header = "email,source,subscribed_at\n";
    const rows = subscribers
      .map((s) =>
        [
          csvEscape(s.email),
          csvEscape(s.source),
          csvEscape(s.createdAt.toISOString()),
        ].join(",")
      )
      .join("\n");

    const csv = header + rows + "\n";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    logger.error({ err }, "[/api/admin/subscribers/export] error");
    return NextResponse.json(
      { ok: false, error: "Failed to export subscribers." },
      { status: 500 }
    );
  }
}
