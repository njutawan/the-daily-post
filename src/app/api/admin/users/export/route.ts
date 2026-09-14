import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/admin/users/export — export all users as a CSV file.
 *
 * Returns a `text/csv` attachment with the columns:
 *   id, email, name, role, subTier, subStatus, subExpiresAt, byline, createdAt,
 *   articlesCount, paymentsCount
 *
 * Properly escapes fields containing commas, quotes, or newlines per
 * RFC 4180.
 */

function csvEscape(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  // RFC 4180: wrap in quotes if the field contains a comma, quote, or
  // newline. Double any quotes inside.
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(req: Request) {
  const admin = await requireRole("admin" as Role);
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Rate limit: 5 req/min per IP+user (heavy CSV export).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${admin.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 5, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subTier: true,
        subStatus: true,
        subExpiresAt: true,
        byline: true,
        createdAt: true,
        _count: { select: { articles: true, payments: true } },
      },
    });

    const header = [
      "id", "email", "name", "role",
      "subTier", "subStatus", "subExpiresAt",
      "byline", "createdAt",
      "articlesCount", "paymentsCount",
    ];
    const rows = users.map((u) => [
      u.id,
      u.email,
      u.name ?? "",
      u.role,
      u.subTier,
      u.subStatus,
      u.subExpiresAt ? u.subExpiresAt.toISOString() : "",
      u.byline ?? "",
      u.createdAt.toISOString(),
      String(u._count.articles),
      String(u._count.payments),
    ].map(csvEscape).join(","));

    const csv = [header.map(csvEscape).join(","), ...rows].join("\r\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logger.error({ err }, "[api/admin/users/export] failed");
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
