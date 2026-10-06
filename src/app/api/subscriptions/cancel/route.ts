import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth-unified";
import { BillingError, cancelStripeSubscription } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";
import { StripeApiError, StripeConfigurationError } from "@/lib/stripe";

const CancelSchema = z.object({
  reason: z.string().max(500).optional().default(""),
  immediate: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await rateLimitResponse(req, { max: 3, windowMs: 60_000 });
  if (limit) return limit;

  const body = await req.json().catch(() => null);
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await cancelStripeSubscription({
      userId: user.id,
      immediate: parsed.data.immediate,
    });
    logger.info(
      { userId: user.id, immediate: parsed.data.immediate, reason: parsed.data.reason },
      "[subscriptions/cancel] Stripe cancellation requested",
    );

    return NextResponse.json({
      ok: true,
      subscription: {
        tier: user.subTier,
        status: result.status,
        expiresAt: result.expiresAt?.toISOString() ?? null,
      },
      immediate: parsed.data.immediate,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
      refundIssued: false,
    });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof StripeConfigurationError) {
      logger.error({ err: error }, "[/api/subscriptions/cancel] Stripe configuration missing");
      return NextResponse.json({ error: "Billing management is not configured yet." }, { status: 503 });
    }
    if (error instanceof StripeApiError) {
      logger.error({ err: error, userId: user.id }, "[/api/subscriptions/cancel] Stripe API error");
      return NextResponse.json({ error: "Stripe could not cancel the subscription. Please try again." }, { status: 502 });
    }
    logger.error({ err: error, userId: user.id }, "[/api/subscriptions/cancel] failed");
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
