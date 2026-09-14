import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminPaymentsView } from "@/components/admin/payments-view";
import { AdminForbidden } from "@/components/admin/forbidden";
import type { AdminPaymentRow } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Payments — The Daily Post Admin",
  description: "Every payment captured by the mock provider. Filter and export to CSV.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return <AdminForbidden signedIn={Boolean(session)} />;
  }

  const [pendingCount, paymentRows, totalSucceededAgg, failedCount, refundedAgg] = await Promise.all([
    db.article.count({ where: { status: "pending_review" } }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.payment.aggregate({
      where: { status: "succeeded" },
      _sum: { amount: true },
    }),
    db.payment.count({ where: { status: "failed" } }),
    db.payment.aggregate({
      where: { status: "refunded" },
      _sum: { amount: true },
    }),
  ]);

  const payments: AdminPaymentRow[] = paymentRows.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    tier: p.tier,
    billingCycle: p.billingCycle,
    status: p.status,
    provider: p.provider,
    providerInvoice: p.providerInvoice,
    createdAt: p.createdAt.toISOString(),
    user: {
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
    },
  }));

  return (
    <AdminPaymentsView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
      pendingCount={pendingCount}
      payments={payments}
      totalSucceeded={totalSucceededAgg._sum.amount ?? 0}
      failedCount={failedCount}
      refundedAmount={refundedAgg._sum.amount ?? 0}
    />
  );
}
