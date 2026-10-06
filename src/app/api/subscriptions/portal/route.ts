import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-unified";
import { BillingError, createStripePortalSession } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";
import { StripeApiError, StripeConfigurationError } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Create a short-lived Stripe Customer Portal session for the signed-in user. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });

  const limit = await rateLimitResponse(request, { max: 5, windowMs: 60_000 });
  if (limit) return limit;

  try {
    const portal = await createStripePortalSession({
      userId: user.id,
      requestOrigin: request.nextUrl.origin,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof StripeConfigurationError) {
      logger.error({ err: error }, "[/api/subscriptions/portal] Stripe configuration missing");
      return NextResponse.json({ error: "Billing management is not configured yet." }, { status: 503 });
    }
    if (error instanceof StripeApiError) {
      logger.error({ err: error, userId: user.id }, "[/api/subscriptions/portal] Stripe API error");
      return NextResponse.json({ error: "Stripe could not open the billing portal." }, { status: 502 });
    }
    logger.error({ err: error, userId: user.id }, "[/api/subscriptions/portal] failed");
    return NextResponse.json({ error: "Unable to open billing management." }, { status: 500 });
  }
}
