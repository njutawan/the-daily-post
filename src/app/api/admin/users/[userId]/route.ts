import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const UpdateUserSchema = z.object({
  role: z.enum(["reader", "editor", "admin"]).optional(),
  subTier: z.enum(["free", "digital", "allaccess"]).optional(),
  subStatus: z.enum(["active", "canceled", "expired", "past_due"]).optional(),
  subExpiresAt: z.string().datetime().optional().nullable(),
  name: z.string().max(100).optional(),
  byline: z.string().max(100).optional().nullable(),
}).refine(
  // When subTier is being set to "free", the expiry must be cleared —
  // a free tier has no expiry date.
  (data) => !(data.subTier === "free" && data.subExpiresAt),
  { message: "Free tier cannot have an expiry date — set subExpiresAt to null", path: ["subExpiresAt"] }
);

type RouteContext = { params: Promise<{ userId: string }> };

/**
 * PATCH /api/admin/users/[userId] — admin updates a user's role or subscription.
 *
 * Guards:
 *  - Admins cannot demote themselves (would lock themselves out).
 *  - Setting subTier to "free" requires subExpiresAt to be null.
 *  - If the target user doesn't exist, return 404 (not a generic 500).
 */
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { userId } = await ctx.params;
  const admin = await requireRole("admin" as Role);
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Rate limit: 60 user updates per minute per admin.
  const limit = rateLimit(req, { max: 60, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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

    const update: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.subExpiresAt !== undefined) {
      update.subExpiresAt = parsed.data.subExpiresAt ? new Date(parsed.data.subExpiresAt) : null;
    }
    // If subTier is being set to free, also clear the expiry (defensive
    // — the zod refine above should already prevent this, but we double
    // check here in case the client sends both fields).
    if (parsed.data.subTier === "free") {
      update.subExpiresAt = null;
      update.subStatus = parsed.data.subStatus ?? "active";
    }

    const user = await db.user.update({
      where: { id: userId },
      data: update,
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
