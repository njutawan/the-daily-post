import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth-unified";
import { BillingError, createStripeCheckoutSession } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";
import { StripeApiError, StripeConfigurationError } from "@/lib/stripe";

const SubscribeSchema = z.object({
  planId: z.enum(["digital", "digital-annual", "allaccess"]),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
  }

  const limit = await rateLimitResponse(req, { max: 5, windowMs: 60_000 });
  if (limit) return limit;

  const body = await req.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid subscription plan." }, { status: 400 });
  }

  try {
    const checkout = await createStripeCheckoutSession({
      userId: user.id,
      planId: parsed.data.planId,
      requestOrigin: req.nextUrl.origin,
    });
    return NextResponse.json({ ok: true, checkoutUrl: checkout.url });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof StripeConfigurationError) {
      logger.error({ err: error }, "[/api/subscriptions/subscribe] Stripe configuration missing");
      return NextResponse.json({ error: "Secure checkout is not configured yet. Please contact support." }, { status: 503 });
    }
    if (error instanceof StripeApiError) {
      logger.error({ err: error, userId: user.id }, "[/api/subscriptions/subscribe] Stripe API error");
      return NextResponse.json({ error: "Stripe could not start checkout. Please try again." }, { status: 502 });
    }
    logger.error({ err: error, userId: user.id, planId: parsed.data.planId }, "[/api/subscriptions/subscribe] failed");
    return NextResponse.json({ error: "Unable to start checkout. Please try again." }, { status: 500 });
  }
}
