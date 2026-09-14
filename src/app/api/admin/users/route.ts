import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/admin/users — list users for admin management.
 * Query: role, subTier, q (search name/email), limit, offset
 */
export async function GET(req: NextRequest) {
  const user = await requireRole("admin" as Role);
  if (!user) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Rate limit: 20 req/min per IP+user (admin user management).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 20, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const url = req.nextUrl;
  const role = url.searchParams.get("role") || undefined;
  const subTier = url.searchParams.get("subTier") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (subTier) where.subTier = subTier;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }

  try {
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subTier: true,
          subStatus: true,
          subExpiresAt: true,
          avatarUrl: true,
          byline: true,
          createdAt: true,
          // Aggregates
          _count: {
            select: {
              articles: true,
              payments: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, limit, offset });
  } catch (err) {
    logger.error({ err }, "[api/admin/users] GET failed");
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
