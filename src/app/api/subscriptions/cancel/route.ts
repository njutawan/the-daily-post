import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const CancelSchema = z.object({
  reason: z.string().max(500).optional().default(""),
  immediate: z.boolean().optional().default(false),
});

/**
 * POST /api/subscriptions/cancel — cancel the current user's subscription.
 *
 * - `immediate: true` → subStatus = "canceled", subExpiresAt = now,
 *   subTier stays the same (the user keeps access until the expiry which
 *   is now in the past, so they effectively lose access immediately).
 * - `immediate: false` (default) → subStatus = "canceled", but
 *   subExpiresAt is preserved — the user keeps access until the end of
 *   the current billing period, then the subscription lapses.
 *
 * Records a Payment with status "refunded" if `immediate: true` AND the
 * user had a succeeded payment in the last 30 days (prorated refund in
 * the demo). In production this would be a Stripe refund call.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 cancel attempts per minute (prevent abuse).
  const limit = rateLimit(req, { max: 3, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { immediate, reason } = parsed.data;

  // Guard: free users have nothing to cancel.
  if (user.subTier === "free") {
    return NextResponse.json(
      { error: "You don't have a paid subscription to cancel" },
      { status: 400 }
    );
  }

  // Guard: already canceled.
  if (user.subStatus === "canceled" || user.subStatus === "expired") {
    return NextResponse.json(
      { error: "Your subscription is already canceled" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const update: Record<string, unknown> = {
      subStatus: "canceled",
    };

    if (immediate) {
      update.subExpiresAt = now;
      // Demo refund: if there's a succeeded payment in the last 30
      // days, mark it as refunded (prorated). In production this would
      // call the Stripe refund API.
      const recentPayment = await db.payment.findFirst({
        where: {
          userId: user.id,
          status: "succeeded",
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recentPayment) {
        await db.payment.update({
          where: { id: recentPayment.id },
          data: { status: "refunded" },
        });
      }
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: update,
      select: {
        subTier: true,
        subStatus: true,
        subExpiresAt: true,
      },
    });

    logger.info(
      { userId: user.id, immediate, reason },
      "[subscriptions/cancel] subscription canceled"
    );

    return NextResponse.json({
      ok: true,
      subscription: {
        tier: updated.subTier,
        status: updated.subStatus,
        expiresAt: updated.subExpiresAt?.toISOString() ?? null,
      },
      immediate,
    });
  } catch (err) {
    logger.error({ err, userId: user.id }, "[api/subscriptions/cancel] failed");
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
