import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-unified";
import { BillingError, createStripeCheckoutSession } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";
import { StripeApiError, StripeConfigurationError } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Legacy endpoint retained as a Stripe Checkout alias. It never grants access. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to subscribe." }, { status: 401 });
  }

  const limited = await rateLimitByKeyResponse(
    `ip:${getClientIp(req)}:user:${user.id}`,
    { max: 5, windowMs: 60_000 },
  );
  if (limited) return limited;

  const body = await req.json().catch(() => null) as { tier?: unknown; planId?: unknown } | null;
  const planId = body?.planId ?? body?.tier;
  const normalizedPlan = planId === "digital" || planId === "allaccess" ? planId : null;
  if (!normalizedPlan) {
    return NextResponse.json({ ok: false, error: "Invalid subscription plan." }, { status: 422 });
  }

  try {
    const checkout = await createStripeCheckoutSession({
      userId: user.id,
      planId: normalizedPlan,
      requestOrigin: req.nextUrl.origin,
    });
    return NextResponse.json({ ok: true, checkoutUrl: checkout.url });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof StripeConfigurationError) {
      logger.error({ err: error }, "[/api/checkout] Stripe configuration missing");
      return NextResponse.json({ ok: false, error: "Secure checkout is not configured yet." }, { status: 503 });
    }
    if (error instanceof StripeApiError) {
      logger.error({ err: error, userId: user.id }, "[/api/checkout] Stripe API error");
      return NextResponse.json({ ok: false, error: "Stripe could not start checkout." }, { status: 502 });
    }
    logger.error({ err: error, userId: user.id }, "[/api/checkout] error");
    return NextResponse.json({ ok: false, error: "Failed to start checkout." }, { status: 500 });
  }
}
