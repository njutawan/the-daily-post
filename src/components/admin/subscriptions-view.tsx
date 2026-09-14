"use client";

/**
 * Subscription monitoring view.
 *
 * Renders tier breakdowns as colored Tailwind bar widths (no chart library),
 * recent cancellations, and an "expiring soon" list.
 */

import { CalendarClock, CreditCard, DollarSign, Users } from "lucide-react";
import { DashboardPageHeader, StatCard, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import {
  formatDate,
  formatCurrency,
  subStatusBadgeClass,
  tierBadgeClass,
  titleCase,
} from "@/components/admin/helpers";

export interface AdminSubsStats {
  activeSubscribers: number;
  mrr: number; // cents
  totalRevenue: number; // cents
  churned: number;
  activeByTier: { free: number; digital: number; allaccess: number };
  cancellations: Array<{
    id: string;
    user: { id: string; name: string | null; email: string };
    subTier: string;
    subStatus: string;
    subExpiresAt: string | null;
    createdAt: string;
  }>;
  expiringSoon: Array<{
    id: string;
    user: { id: string; name: string | null; email: string };
    subTier: string;
    subExpiresAt: string;
    daysLeft: number;
  }>;
}

export interface AdminSubsViewProps {
  user: AdminShellUser;
  pendingCount: number;
  stats: AdminSubsStats;
}

export function AdminSubsView({ user, pendingCount, stats }: AdminSubsViewProps) {
  const totalActive =
    stats.activeByTier.free +
    stats.activeByTier.digital +
    stats.activeByTier.allaccess;
  const payingActive =
    stats.activeByTier.digital + stats.activeByTier.allaccess;

  return (
    <AdminShell
      user={user}
      navBadge={[{ href: "/admin/reviews", count: pendingCount }]}
    >
      <DashboardPageHeader
        eyebrow="Revenue"
        title="Subscriptions"
        description="Monitor active subscribers, churn, MRR, and renewals across the membership tiers."
      />

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Active Subscribers"
          value={payingActive.toLocaleString()}
          icon={Users}
          accent="text-emerald-700 dark:text-emerald-400"
          hint={`${stats.activeByTier.digital} digital · ${stats.activeByTier.allaccess} all-access`}
        />
        <StatCard
          label="Monthly Recurring Revenue"
          value={formatCurrency(stats.mrr)}
          icon={DollarSign}
          accent="text-emerald-700 dark:text-emerald-400"
          hint="last 30 days + 1/12 annual"
        />
        <StatCard
          label="Total Revenue (all time)"
          value={formatCurrency(stats.totalRevenue)}
          icon={CreditCard}
          accent="text-stone-700 dark:text-stone-300"
          hint="succeeded payments"
        />
      </div>

      {/* Tier breakdown */}
      <section className="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
          Subscribers by tier
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Distribution of {totalActive.toLocaleString()} registered users across the three tiers.
        </p>
        <div className="mt-5 space-y-4">
          <TierBar
            label="Free"
            count={stats.activeByTier.free}
            total={totalActive}
            barClass="bg-stone-400 dark:bg-stone-500"
            badgeClass={tierBadgeClass("free")}
          />
          <TierBar
            label="Digital"
            count={stats.activeByTier.digital}
            total={totalActive}
            barClass="bg-stone-900 dark:bg-stone-100"
            badgeClass={tierBadgeClass("digital")}
          />
          <TierBar
            label="All Access"
            count={stats.activeByTier.allaccess}
            total={totalActive}
            barClass="bg-emerald-600 dark:bg-emerald-500"
            badgeClass={tierBadgeClass("allaccess")}
          />
        </div>
        <div className="mt-5 pt-4 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-400">
          Churned (canceled / expired): <span className="font-semibold text-rose-700 dark:text-rose-400">{stats.churned.toLocaleString()}</span> · Paying share: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{totalActive > 0 ? Math.round((payingActive / totalActive) * 100) : 0}%</span>
        </div>
      </section>

      {/* Two-column lists */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent cancellations */}
        <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <header className="border-b border-stone-200 dark:border-stone-800 px-5 py-4">
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
              Recent Cancellations
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Last {stats.cancellations.length} canceled subscriptions
            </p>
          </header>
          {stats.cancellations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CreditCard}
                title="No recent cancellations"
                description="No one has canceled in the last 30 days."
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800 max-h-[24rem] overflow-y-auto">
              {stats.cancellations.map((c) => (
                <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {c.user.name ?? c.user.email}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {c.user.email} · {formatDate(c.subExpiresAt)} (was {titleCase(c.subTier)})
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${subStatusBadgeClass(
                      c.subStatus
                    )}`}
                  >
                    {titleCase(c.subStatus)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Expiring soon */}
        <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <header className="border-b border-stone-200 dark:border-stone-800 px-5 py-4">
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
              Expiring Soon
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Active subscriptions expiring within 7 days
            </p>
          </header>
          {stats.expiringSoon.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarClock}
                title="No renewals due"
                description="No active subscriptions expire in the next 7 days."
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800 max-h-[24rem] overflow-y-auto">
              {stats.expiringSoon.map((e) => (
                <li key={e.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {e.user.name ?? e.user.email}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {e.user.email} · {formatDate(e.subExpiresAt)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      e.daysLeft <= 2
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {e.daysLeft === 0 ? "Today" : `${e.daysLeft}d left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function TierBar({
  label,
  count,
  total,
  barClass,
  badgeClass,
}: {
  label: string;
  count: number;
  total: number;
  barClass: string;
  badgeClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
          >
            {label}
          </span>
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            {count.toLocaleString()} users
          </span>
        </div>
        <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
