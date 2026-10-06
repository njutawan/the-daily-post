import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";

const UpdateUserSchema = z.object({
  role: z.enum(["reader", "editor", "admin"]).optional(),
  name: z.string().max(100).optional(),
  byline: z.string().max(100).optional().nullable(),
}).strict();

type RouteContext = { params: Promise<{ userId: string }> };

/**
 * PATCH /api/admin/users/[userId] — admin updates profile fields and editorial role.
 * Subscription entitlements are read-only here and are synchronized from Stripe.
 *
 * Guards:
 *  - Admins cannot demote themselves (would lock themselves out).
 *  - Subscription fields are rejected rather than manually granting paid access.
 *  - If the target user doesn't exist, return 404 (not a generic 500).
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { userId } = await ctx.params;
  const admin = await requireRole("admin" as Role);
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Rate limit: 60 user updates per minute per admin.
  const limit = await rateLimitResponse(req, { max: 60, windowMs: 60_000 });
  if (limit) return limit;

  const body = await req.json().catch(() => null);
  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Prevent admins from demoting themselves.
  if (userId === admin.id && parsed.data.role && parsed.data.role !== "admin") {
    return NextResponse.json(
      { error: "You cannot demote your own account" },
      { status: 400 }
    );
  }

  try {
    // Verify the target user exists — fail with 404 instead of a
    // generic Prisma "record not found" 500.
    const existing = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true, email: true, name: true, role: true,
        subTier: true, subStatus: true, subExpiresAt: true, byline: true,
      },
    });

    logger.info(
      { targetUserId: userId, adminId: admin.id, changes: parsed.data },
      "[admin/users] user updated"
    );

    return NextResponse.json({ user });
  } catch (err) {
    logger.error({ err, targetUserId: userId, adminId: admin.id }, "[api/admin/users/[id]] PATCH failed");
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
