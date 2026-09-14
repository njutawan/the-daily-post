"use client";

/**
 * Admin dashboard view — comprehensive overview.
 *
 * Receives already-serialized data from the server component
 * (no Date objects, no Prisma types) and renders the StatCards, pending
 * review queue, recent payments, and quick-actions sidebar inside the
 * `AdminShell`.
 */

import Link from "next/link";
import {
  Users,
  BadgeCheck,
  ClipboardCheck,
  Newspaper,
  DollarSign,
  Eye,
  MessageSquare,
  UserPlus,
  ArrowRight,
  UsersRound,
  Newspaper as NewspaperIcon,
  Flag,
  Download,
  CreditCard,
  BarChart3,
} from "lucide-react";
import { DashboardPageHeader, StatCard, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import {
  formatCurrency,
  formatRelative,
  statusBadgeClass,
  statusLabel,
  tierBadgeClass,
  titleCase,
} from "@/components/admin/helpers";
import type { AdminArticleRow, AdminPaymentRow } from "@/components/admin/types";
import { Badge } from "@/components/ui/badge";

export interface AdminDashboardStats {
  usersTotal: number;
  usersEditors: number;
  usersAdmins: number;
  usersReaders: number;
  subsFree: number;
  subsDigital: number;
  subsAllAccess: number;
  activeSubscribers: number;
  articlesDraft: number;
  articlesPending: number;
  articlesPublished: number;
  articlesRejected: number;
  revenueTotal: number; // cents
  revenueCount: number;
  recentViews30d: number;
  recentComments30d: number;
  recentNewUsers30d: number;
  legacyCommentReports: number;
  legacyTypoReports: number;
  legacySubscribers: number;
}

export interface AdminDashboardProps {
  user: AdminShellUser;
  stats: AdminDashboardStats;
  pendingArticles: AdminArticleRow[];
  recentPayments: AdminPaymentRow[];
}

export function AdminDashboardView({
  user,
  stats,
  pendingArticles,
  recentPayments,
}: AdminDashboardProps) {
  const navBadge = [
    { href: "/admin/reviews", count: stats.articlesPending },
    { href: "/admin/reports", count: stats.legacyCommentReports },
    { href: "/admin/typos", count: stats.legacyTypoReports },
  ];

  return (
    <AdminShell user={user} navBadge={navBadge}>
      <DashboardPageHeader
        eyebrow="Admin Console"
        title="Newsroom Dashboard"
        description="A real-time snapshot of users, editorial pipeline, revenue, and engagement across The Daily Post."
      />

      {/* Stat grid (4-col desktop, 2-col mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={stats.usersTotal.toLocaleString()}
          icon={Users}
          accent="text-stone-700 dark:text-stone-300"
          hint={`${stats.usersReaders} readers · ${stats.usersEditors} editors`}
        />
        <StatCard
          label="Active Subscribers"
          value={stats.activeSubscribers.toLocaleString()}
          icon={BadgeCheck}
          accent="text-emerald-700 dark:text-emerald-400"
          hint={`${stats.subsDigital} digital · ${stats.subsAllAccess} all-access`}
        />
        <StatCard
          label="Pending Reviews"
          value={stats.articlesPending.toLocaleString()}
          icon={ClipboardCheck}
          accent="text-amber-700 dark:text-amber-400"
          hint={stats.articlesPending > 0 ? "Awaiting review" : "Queue is clear"}
        />
        <StatCard
          label="Published Articles"
          value={stats.articlesPublished.toLocaleString()}
          icon={Newspaper}
          accent="text-stone-700 dark:text-stone-300"
          hint={`${stats.articlesDraft} drafts · ${stats.articlesRejected} rejected`}
        />
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(stats.revenueTotal)}
          icon={DollarSign}
          accent="text-emerald-700 dark:text-emerald-400"
          hint={`${stats.revenueCount} successful payments`}
        />
        <StatCard
          label="Views (30d)"
          value={stats.recentViews30d.toLocaleString()}
          icon={Eye}
          accent="text-stone-700 dark:text-stone-300"
        />
        <StatCard
          label="Comments (30d)"
          value={stats.recentComments30d.toLocaleString()}
          icon={MessageSquare}
          accent="text-stone-700 dark:text-stone-300"
        />
        <StatCard
          label="New Users (30d)"
          value={stats.recentNewUsers30d.toLocaleString()}
          icon={UserPlus}
          accent="text-stone-700 dark:text-stone-300"
        />
      </div>

      {/* Main grid: pending queue + payments */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Review Queue */}
        <section className="lg:col-span-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-5 py-4">
            <div>
              <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                Pending Review Queue
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {pendingArticles.length} of {stats.articlesPending} awaiting review
              </p>
            </div>
            <Link
              href="/admin/reviews"
              className="text-xs uppercase tracking-[0.18em] text-rose-700 hover:underline dark:text-rose-400"
            >
              Open queue →
            </Link>
          </header>

          {pendingArticles.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ClipboardCheck}
                title="No articles awaiting review"
                description="When editors submit an article for review, it will appear here for admin approval."
                action={
                  <Link
                    href="/admin/articles"
                    className="inline-flex items-center gap-2 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-sm font-medium"
                  >
                    Browse all articles <ArrowRight className="h-4 w-4" />
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800 max-h-[28rem] overflow-y-auto">
              {pendingArticles.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/reviews`}
                      className="block font-headline text-base font-semibold text-stone-900 dark:text-stone-50 hover:text-rose-700 dark:hover:text-rose-400 transition-colors truncate"
                    >
                      {a.title}
                    </Link>
                    <div className="mt-1 flex items-center flex-wrap gap-2 text-xs text-stone-500 dark:text-stone-400">
                      <span className="font-medium text-stone-700 dark:text-stone-300">
                        {a.author.byline ?? a.author.name ?? "Unknown"}
                      </span>
                      <span>·</span>
                      <span className="uppercase tracking-wider">{a.category}</span>
                      <span>·</span>
                      <span>Submitted {formatRelative(a.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(
                        a.status
                      )}`}
                    >
                      {statusLabel(a.status)}
                    </span>
                    <Link
                      href={`/admin/reviews`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-rose-700 text-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-800 transition-colors"
                    >
                      Review <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Payments */}
        <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-5 py-4">
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Recent Payments
            </h2>
            <Link
              href="/admin/payments"
              className="text-xs uppercase tracking-[0.18em] text-rose-700 hover:underline dark:text-rose-400"
            >
              All →
            </Link>
          </header>

          {recentPayments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CreditCard}
                title="No payments yet"
                description="Successful subscription payments will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800 max-h-[28rem] overflow-y-auto">
              {recentPayments.map((p) => (
                <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {p.user.name ?? p.user.email}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {p.user.email}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider ${tierBadgeClass(
                          p.tier
                        )}`}
                      >
                        {titleCase(p.tier)}
                      </span>
                      <span>·</span>
                      <span>{p.billingCycle}</span>
                      <span>·</span>
                      <span>{formatRelative(p.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-headline text-base font-bold tabular-nums text-stone-900 dark:text-stone-50">
                      {formatCurrency(p.amount)}
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        p.status === "succeeded"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : p.status === "failed"
                            ? "text-rose-700 dark:text-rose-400"
                            : "text-stone-500"
                      }`}
                    >
                      {p.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <section className="mt-8 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
          Quick Actions
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Jump straight to the most common admin tasks.
        </p>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <QuickAction href="/admin/users" icon={UsersRound} label="Manage Users" />
          <QuickAction href="/admin/reviews" icon={ClipboardCheck} label="Review Articles" badge={stats.articlesPending} />
          <QuickAction href="/admin/reports" icon={Flag} label="View Reports" badge={stats.legacyCommentReports} />
          <QuickAction href="/admin/subscribers" icon={Download} label="Export Subscribers" />
          <QuickAction href="/admin/articles" icon={NewspaperIcon} label="All Articles" />
          <QuickAction href="/admin/subscriptions" icon={CreditCard} label="Subscriptions" />
          <QuickAction href="/admin/payments" icon={CreditCard} label="Payments" />
          <QuickAction href="/admin/analytics" icon={BarChart3} label="Analytics" />
        </div>
      </section>
    </AdminShell>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-md border border-stone-200 dark:border-stone-800 px-4 py-3 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 text-stone-500 dark:text-stone-400 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors" />
        <span className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
          {label}
        </span>
      </div>
      {badge !== undefined && badge > 0 && (
        <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-transparent">
          {badge}
        </Badge>
      )}
    </Link>
  );
}
