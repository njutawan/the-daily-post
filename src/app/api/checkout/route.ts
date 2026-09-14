import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-unified";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIER_PRICES: Record<string, { price: number; tier: string }> = {
  digital: { price: 4.99, tier: "digital" },
  allaccess: { price: 9.99, tier: "allaccess" },
};

/**
 * Mock checkout endpoint.
 * In production, this would redirect to Stripe Checkout.
 * For the template, it directly upgrades the user's subscription tier.
 */
export async function POST(req: NextRequest) {
  const authUser = await getSessionUser();
  if (!authUser?.email) {
    return NextResponse.json(
      { ok: false, error: "Please sign in to subscribe." },
      { status: 401 }
    );
  }

  // Rate limit: 5 req/min per IP+user (payment endpoint — strict).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${authUser.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 5, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  let body: { tier?: unknown };
  try {
    body = await req.json();
  } catch {
    const url = new URL(req.url);
    body = { tier: url.searchParams.get("tier") };
  }

  const tierKey = typeof body.tier === "string" ? body.tier : "";
  const tierInfo = TIER_PRICES[tierKey];

  if (!tierInfo) {
    return NextResponse.json(
      { ok: false, error: "Invalid subscription tier. Use 'digital' or 'allaccess'." },
      { status: 422 }
    );
  }

  try {
    const user = await db.user.findUnique({
      where: { email: authUser.email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 404 }
      );
    }

    // Mock: upgrade user to subscriber
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db.user.update({
      where: { id: user.id },
      data: {
        role: "subscriber",
        subTier: tierInfo.tier,
        subStatus: "active",
        subExpiresAt: expiresAt,
      },
    });

    logger.info({ email: user.email, tier: tierInfo.tier }, "Subscription activated (mock checkout)");

    return NextResponse.json({
      ok: true,
      message: "Subscription activated! Enjoy unlimited access.",
      tier: tierInfo.tier,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "[/api/checkout] error");
    return NextResponse.json(
      { ok: false, error: "Failed to process subscription." },
      { status: 500 }
    );
  }
}
