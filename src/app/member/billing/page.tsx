import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { MemberBillingView } from "@/components/member/billing-view";
import { SignInRequiredCard } from "@/components/member/sign-in-required";
import type { BillingSummary, MemberUser, PaymentItem } from "@/components/member/types";

export const metadata: Metadata = {
  title: "Billing History — The Daily Post",
  description: "Invoices and payment history for your subscription.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MemberBillingPage() {
  const session = await getSessionUser();
  if (!session) {
    return <SignInRequiredCard />;
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, email: true, name: true, role: true,
      subTier: true, subStatus: true, subExpiresAt: true, avatarUrl: true,
      byline: true, bio: true, createdAt: true,
    },
  });
  if (!dbUser) return <SignInRequiredCard />;

  const user: MemberUser = {
    id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role,
    subTier: dbUser.subTier as MemberUser["subTier"],
    subStatus: dbUser.subStatus as MemberUser["subStatus"],
    subExpiresAt: dbUser.subExpiresAt?.toISOString() ?? null,
    avatarUrl: dbUser.avatarUrl, byline: dbUser.byline, bio: dbUser.bio,
    createdAt: dbUser.createdAt.toISOString(),
  };

  const rows = await db.payment.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const payments: PaymentItem[] = rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    currency: r.currency,
    tier: r.tier,
    billingCycle: r.billingCycle,
    status: r.status,
    provider: r.provider,
    providerInvoice: r.providerInvoice,
    createdAt: r.createdAt.toISOString(),
  }));

  const totalSpentCents = rows
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + r.amount, 0);

  const summary: BillingSummary = {
    totalSpentCents,
    currentPlan: dbUser.subTier,
    nextRenewalAt:
      dbUser.subTier === "free"
        ? null
        : (dbUser.subExpiresAt?.toISOString() ?? null),
    paymentCount: rows.length,
  };

  return (
    <MemberBillingView
      user={user}
      payments={payments}
      summary={summary}
    />
  );
}
