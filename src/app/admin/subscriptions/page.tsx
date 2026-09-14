import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminSubsView } from "@/components/admin/subscriptions-view";
import type { AdminSubsStats } from "@/components/admin/subscriptions-view";
import { AdminForbidden } from "@/components/admin/forbidden";

export const metadata: Metadata = {
  title: "Subscriptions — The Daily Post Admin",
  description: "Monitor active subscribers, churn, MRR, and renewals across membership tiers.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return <AdminForbidden signedIn={Boolean(session)} />;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const oneYearAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365);
  const sevenDaysFromNow = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const [
    pendingCount,
    activeFree,
    activeDigital,
    activeAllAccess,
    churned,
    monthlyRevenue30d,
    annualRevenue365d,
    totalRevenueAgg,
    cancellationUsers,
    expiringUsers,
  ] = await Promise.all([
    db.article.count({ where: { status: "pending_review" } }),
    db.user.count({ where: { subTier: "free", subStatus: "active" } }),
    db.user.count({ where: { subTier: "digital", subStatus: "active" } }),
    db.user.count({ where: { subTier: "allaccess", subStatus: "active" } }),
    db.user.count({
      where: { subStatus: { in: ["canceled", "expired"] } },
    }),
    db.payment.aggregate({
      where: {
        status: "succeeded",
        billingCycle: "monthly",
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: {
        status: "succeeded",
        billingCycle: "annual",
        createdAt: { gte: oneYearAgo },
      },
      _sum: { amount: true },
    }),
    db.payment.aggregate({
      where: { status: "succeeded" },
      _sum: { amount: true },
    }),
    db.user.findMany({
      where: { subStatus: "canceled" },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        subTier: true,
        subStatus: true,
        subExpiresAt: true,
        createdAt: true,
        email: true,
        name: true,
      },
    }),
    db.user.findMany({
      where: {
        subStatus: "active",
        subExpiresAt: { gte: now, lte: sevenDaysFromNow },
      },
      orderBy: { subExpiresAt: "asc" },
      take: 10,
      select: {
        id: true,
        subTier: true,
        subExpiresAt: true,
        email: true,
        name: true,
      },
    }),
  ]);

  const mrr =
    (monthlyRevenue30d._sum.amount ?? 0) +
    Math.round((annualRevenue365d._sum.amount ?? 0) / 12);

  const cancellations: AdminSubsStats["cancellations"] = cancellationUsers.map((u) => ({
    id: u.id,
    user: { id: u.id, name: u.name, email: u.email },
    subTier: u.subTier,
    subStatus: u.subStatus,
    subExpiresAt: u.subExpiresAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));

  const expiringSoon: AdminSubsStats["expiringSoon"] = expiringUsers.map((u) => {
    const ms = (u.subExpiresAt?.getTime() ?? 0) - now.getTime();
    const daysLeft = Math.max(
      0,
      Math.ceil(ms / (1000 * 60 * 60 * 24))
    );
    return {
      id: u.id,
      user: { id: u.id, name: u.name, email: u.email },
      subTier: u.subTier,
      subExpiresAt: u.subExpiresAt!.toISOString(),
      daysLeft,
    };
  });

  const stats: AdminSubsStats = {
    activeSubscribers: activeDigital + activeAllAccess,
    mrr,
    totalRevenue: totalRevenueAgg._sum.amount ?? 0,
    churned,
    activeByTier: {
      free: activeFree,
      digital: activeDigital,
      allaccess: activeAllAccess,
    },
    cancellations,
    expiringSoon,
  };

  return (
    <AdminSubsView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
      pendingCount={pendingCount}
      stats={stats}
    />
  );
}
