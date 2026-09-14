import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/subscriptions/me — current user's subscription + payment history.
 */
export async function GET(req: Request) {
  // Rate limit: 30 req/min per IP.
  const limited = rateLimitResponse(req, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [payments, dbUser] = await Promise.all([
    db.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: {
        subTier: true,
        subStatus: true,
        subExpiresAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    subscription: dbUser
      ? {
          tier: dbUser.subTier,
          status: dbUser.subStatus,
          expiresAt: dbUser.subExpiresAt?.toISOString() ?? null,
        }
      : null,
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      tier: p.tier,
      billingCycle: p.billingCycle,
      status: p.status,
      provider: p.provider,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
