"use client";

/**
 * Client view for the member dashboard (`/member`).
 *
 * Renders the subscription hero card, four StatCards, "Continue reading"
 * list with progress bars, and "Recommended for you" article grid.
 */

import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  CreditCard,
  CalendarClock,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { MemberShell } from "@/components/member/member-shell";
import { StatCard, EmptyState } from "@/components/dashboard/shell";
import {
  PLAN_BADGE_CLASS,
  PLAN_LABELS,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  type ContinueReadingItem,
  type DashboardStats,
  type MemberUser,
  type RecommendedArticle,
  type SubscriptionSummary,
  planLabel,
  progressColor,
} from "@/components/member/types";

interface DashboardViewProps {
  user: MemberUser;
  subscription: SubscriptionSummary;
  stats: DashboardStats;
  continueReading: ContinueReadingItem[];
  recommended: RecommendedArticle[];
}

export function MemberDashboardView({
  user,
  subscription,
  stats,
  continueReading,
  recommended,
}: DashboardViewProps) {
  return (
    <MemberShell user={user}>
      {/* Welcome header */}
      <div className="pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 mb-2">
          Member Dashboard
        </div>
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
          Welcome back, {user.name || user.email.split("@")[0]}.
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
          Here&rsquo;s a snapshot of your reading and subscription.
        </p>
      </div>

      {/* Subscription hero card */}
      <SubscriptionHeroCard subscription={subscription} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard
          label="Articles Read (30 days)"
          value={stats.articlesRead30d}
          icon={BookOpen}
          accent="text-emerald-700"
        />
        <StatCard
          label="Saved Articles"
          value={stats.savedCount}
          icon={Bookmark}
          accent="text-amber-700"
        />
        <StatCard
          label="Current Plan"
          value={PLAN_LABELS[subscription.tier] ?? subscription.tier}
          icon={CreditCard}
          accent="text-emerald-700"
        />
        <StatCard
          label="Days until renewal"
          value={stats.daysUntilRenewal ?? "—"}
          icon={CalendarClock}
          accent="text-amber-700"
          hint={stats.daysUntilRenewal === null ? "No renewal" : undefined}
        />
      </div>

      {/* Continue reading + Recommended */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-xl font-bold text-stone-900 dark:text-stone-50">
              Continue reading
            </h2>
            {continueReading.length > 0 && (
              <Link
                href="/member/history"
                className="text-xs uppercase tracking-[0.18em] text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {continueReading.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Nothing in progress yet"
              description="Start reading an article and we'll save your spot so you can pick up where you left off."
              action={
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-emerald-800 transition-colors"
                >
                  Discover stories <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {continueReading.map((item) => (
                <li
                  key={item.articleId}
                  className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {item.heroImage ? (
                      <img
                        src={item.heroImage}
                        alt=""
                        className="w-full sm:w-28 h-32 sm:h-20 object-cover rounded-md bg-stone-100"
                      />
                    ) : (
                      <div className="w-full sm:w-28 h-32 sm:h-20 rounded-md bg-stone-100 dark:bg-stone-800" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">
                        {item.category}
                      </div>
                      <Link
                        href={`/article/${item.slug}`}
                        className="font-headline text-base font-bold text-stone-900 dark:text-stone-50 hover:underline"
                      >
                        {item.title}
                      </Link>
                      {item.excerpt && (
                        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                          {item.excerpt}
                        </p>
                      )}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                          <span>{item.progress}% complete</span>
                          <span>
                            Last read {format(parseISO(item.lastReadAt), "MMM d")}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${progressColor(item.progress)}`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="sm:self-center">
                      <Link
                        href={`/article/${item.slug}`}
                        className="inline-flex items-center gap-1 rounded-md border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                      >
                        Continue <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              Recommended for you
            </h2>
          </div>
          {recommended.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No recommendations yet"
              description="Check back soon — we'll surface stories based on what you read."
            />
          ) : (
            <ul className="space-y-3">
              {recommended.map((a) => (
                <li
                  key={a.slug}
                  className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex gap-3">
                    {a.heroImage ? (
                      <img
                        src={a.heroImage}
                        alt=""
                        className="w-16 h-16 object-cover rounded-md bg-stone-100 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-stone-100 dark:bg-stone-800 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 mb-0.5">
                        {a.category}
                      </div>
                      <Link
                        href={`/article/${a.slug}`}
                        className="font-headline text-sm font-bold text-stone-900 dark:text-stone-50 hover:underline line-clamp-2"
                      >
                        {a.title}
                      </Link>
                      {a.authorName && (
                        <div className="mt-1 text-[11px] text-stone-500">
                          By {a.authorName}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </MemberShell>
  );
}

function SubscriptionHeroCard({ subscription }: { subscription: SubscriptionSummary }) {
  const expiry = subscription.expiresAt ? format(parseISO(subscription.expiresAt), "MMM d, yyyy") : null;
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
      <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6 text-emerald-700" strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 mb-1">
              Subscription status
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE_CLASS[subscription.tier]}`}
              >
                {planLabel(subscription.tier)}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS[subscription.status as keyof typeof STATUS_BADGE_CLASS]}`}
              >
                {STATUS_LABELS[subscription.status as keyof typeof STATUS_LABELS] ?? subscription.status}
              </span>
            </div>
            {expiry && (
              <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
                {subscription.tier === "free"
                  ? "No renewal date — your free plan does not expire."
                  : `Renews on ${expiry}.`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/member/subscribe"
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-emerald-800 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Manage subscription
          </Link>
          <Link
            href="/member/billing"
            className="inline-flex items-center rounded-md border border-stone-300 dark:border-stone-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-stone-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            Billing
          </Link>
        </div>
      </div>
      {subscription.tier !== "free" && (
        <div className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-5 md:px-6 py-3 text-[11px] text-stone-500">
          Tip: download invoices from your <Link href="/member/billing" className="underline hover:text-emerald-700">billing history</Link>.
          {subscription.tier !== "allaccess" && (
            <> All Access members get premium newsletters and live event invites — <Link href="/member/subscribe" className="underline hover:text-emerald-700">upgrade</Link>.</>
          )}
        </div>
      )}
    </div>
  );
}
