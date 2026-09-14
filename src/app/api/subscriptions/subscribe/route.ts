import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const SubscribeSchema = z.object({
  planId: z.enum(["digital", "digital-annual", "allaccess"]),
  // Mock card token from the client. In production this would be a
  // Stripe/Paddle payment token — ideally a Stripe PaymentIntent id
  // which is already idempotent on Stripe's side.
  paymentToken: z.string().min(8, "Invalid payment token").max(128),
});

const PLAN_TO_TIER: Record<string, { tier: "digital" | "allaccess"; amount: number; billingCycle: string }> = {
  digital: { tier: "digital", amount: 499, billingCycle: "monthly" },
  "digital-annual": { tier: "digital", amount: 4999, billingCycle: "annual" },
  allaccess: { tier: "allaccess", amount: 999, billingCycle: "monthly" },
};

/**
 * POST /api/subscriptions/subscribe — subscribe the current user to a plan.
 *
 * Demo flow:
 *  1. Validate plan + token.
 *  2. Idempotency: if a succeeded payment with the same token exists,
 *     return the existing subscription instead of creating a duplicate.
 *  3. Guard: if the user is already on the requested tier with an active
 *     subscription that hasn't expired, refuse with 409 (don't double-charge).
 *  4. Create a Payment record (status: succeeded, provider: mock).
 *  5. Update the user's subTier, subStatus, subExpiresAt.
 *
 * In production this would redirect to a Stripe Checkout session
 * and the webhook would flip the subscription status.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to subscribe" }, { status: 401 });
  }

  // Rate limit: 5 subscribe attempts per minute per IP.
  const limit = rateLimit(req, { max: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { planId, paymentToken } = parsed.data;
  const plan = PLAN_TO_TIER[planId];

  try {
    // Idempotency: if we've already processed this token, return the
    // existing payment + the user's current subscription.
    const existing = await db.payment.findFirst({
      where: { providerInvoice: `mock_${paymentToken.slice(0, 24)}` },
    });
    if (existing && existing.status === "succeeded") {
      const refreshed = await db.user.findUnique({
        where: { id: user.id },
        select: { subTier: true, subStatus: true, subExpiresAt: true },
      });
      return NextResponse.json({
        ok: true,
        idempotent: true,
        payment: { id: existing.id, amount: existing.amount, status: existing.status },
        subscription: refreshed
          ? {
              tier: refreshed.subTier,
              status: refreshed.subStatus,
              expiresAt: refreshed.subExpiresAt?.toISOString() ?? null,
            }
          : null,
      });
    }

    // Guard: don't double-charge for the same tier if the subscription
    // is still active and not expired.
    if (
      user.subTier === plan.tier &&
      user.subStatus === "active" &&
      user.subExpiresAt &&
      user.subExpiresAt > new Date()
    ) {
      return NextResponse.json(
        {
          error: "You're already subscribed to this plan. Your subscription is still active.",
          subscription: {
            tier: user.subTier,
            status: user.subStatus,
            expiresAt: user.subExpiresAt.toISOString(),
          },
        },
        { status: 409 }
      );
    }

    // Create the payment record (mock).
    const payment = await db.payment.create({
      data: {
        userId: user.id,
        amount: plan.amount,
        currency: "USD",
        tier: plan.tier,
        billingCycle: plan.billingCycle,
        status: "succeeded",
        provider: "mock",
        providerInvoice: `mock_${paymentToken.slice(0, 24)}`,
      },
    });

    // Compute expiry — 1 month or 1 year from now.
    const now = new Date();
    const expires = new Date(now);
    if (plan.billingCycle === "annual") {
      expires.setFullYear(expires.getFullYear() + 1);
    } else {
      expires.setMonth(expires.getMonth() + 1);
    }

    // Update the user.
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        subTier: plan.tier,
        subStatus: "active",
        subExpiresAt: expires,
      },
    });

    return NextResponse.json({
      ok: true,
      payment: { id: payment.id, amount: payment.amount, status: payment.status },
      subscription: {
        tier: updated.subTier,
        status: updated.subStatus,
        expiresAt: updated.subExpiresAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, userId: user.id, planId }, "[api/subscriptions/subscribe] failed");
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
