import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/subscriptions/plans — public list of subscription plans.
 * Used by the member area to display upgrade options.
 *
 * In production this could come from Stripe Products/Prices. For the
 * demo we return a static catalog with amounts in minor units (cents).
 */
export async function GET(req: Request) {
  // Rate limit: 30 req/min per IP (static catalog).
  const limited = rateLimitResponse(req, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const plans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      currency: "USD",
      billingCycle: "monthly",
      tagline: "Read 3 articles each month.",
      features: [
        "3 free articles / month",
        "Newsletters (daily briefing)",
        "Save up to 5 articles",
      ],
      cta: "Current plan",
      highlight: false,
    },
    {
      id: "digital",
      name: "Digital",
      price: 499,
      currency: "USD",
      billingCycle: "monthly",
      tagline: "Unlimited articles on every device.",
      features: [
        "Unlimited articles",
        "Reader-friendly article pages (no ads)",
        "Save unlimited articles",
        "Reading history across devices",
        "Audio narration of articles",
      ],
      cta: "Subscribe $4.99 / month",
      highlight: true,
    },
    {
      id: "digital-annual",
      name: "Digital Annual",
      price: 4999,
      currency: "USD",
      billingCycle: "annual",
      tagline: "Save 17% with the yearly plan.",
      features: [
        "Everything in Digital",
        "Save 17% vs monthly",
        "Priority newsletter access",
        "Early access to investigations",
      ],
      cta: "Subscribe $49.99 / year",
      highlight: false,
      tier: "digital",
    },
    {
      id: "allaccess",
      name: "All Access",
      price: 999,
      currency: "USD",
      billingCycle: "monthly",
      tagline: "Digital + premium newsletters + events.",
      features: [
        "Everything in Digital",
        "Premium newsletters (Politics, Tech, Climate)",
        "Invitations to live events",
        "Comment without moderation queue",
        "The Daily Post crossword archive",
      ],
      cta: "Subscribe $9.99 / month",
      highlight: false,
    },
  ] as const;

  return NextResponse.json({ plans });
}
