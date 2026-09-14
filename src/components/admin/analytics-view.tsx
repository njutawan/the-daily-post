"use client";

/**
 * Analytics dashboard view.
 *
 * Pure Tailwind/CSS visualizations (no chart library):
 *  - 30-day views trend (bar chart with day labels every 5 days)
 *  - Top categories by views (horizontal bars)
 *  - Most viewed articles (table)
 *  - Most commented articles (table)
 *  - Top authors (table — editors ranked by published article count + total views)
 */

import { DashboardPageHeader, StatCard, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import {
  formatDate,
  tierBadgeClass,
  titleCase,
} from "@/components/admin/helpers";
import { ARTICLE_CATEGORIES } from "@/components/admin/types";
import { Eye, MessageSquare, TrendingUp, Layers, Newspaper, Users } from "lucide-react";

export interface AdminAnalyticsData {
  totalViews30d: number;
  totalComments30d: number;
  publishedArticles: number;
  totalAuthors: number;
  viewsTrend: Array<{ day: string; count: number }>; // 30 entries, day = ISO date
  topCategories: Array<{ category: string; views: number; articles: number }>;
  mostViewed: Array<{
    id: string;
    slug: string;
    title: string;
    viewCount: number;
    commentCount: number;
    publishedAt: string | null;
    category: string;
  }>;
  mostCommented: Array<{
    id: string;
    slug: string;
    title: string;
    commentCount: number;
    viewCount: number;
    category: string;
  }>;
  topAuthors: Array<{
    id: string;
    name: string | null;
    byline: string | null;
    publishedCount: number;
    totalViews: number;
  }>;
}

export interface AdminAnalyticsViewProps {
  user: AdminShellUser;
  pendingCount: number;
  data: AdminAnalyticsData;
}

export function AdminAnalyticsView({ user, pendingCount, data }: AdminAnalyticsViewProps) {
  return (
    <AdminShell
      user={user}
      navBadge={[{ href: "/admin/reviews", count: pendingCount }]}
    >
      <DashboardPageHeader
        eyebrow="Insights"
        title="Analytics"
        description="A 30-day snapshot of readership, engagement, categories, and editorial productivity across the newsroom."
      />

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Views (30d)"
          value={data.totalViews30d.toLocaleString()}
          icon={Eye}
          accent="text-stone-700 dark:text-stone-300"
        />
        <StatCard
          label="Comments (30d)"
          value={data.totalComments30d.toLocaleString()}
          icon={MessageSquare}
          accent="text-stone-700 dark:text-stone-300"
        />
        <StatCard
          label="Published Articles"
          value={data.publishedArticles.toLocaleString()}
          icon={Newspaper}
          accent="text-emerald-700 dark:text-emerald-400"
        />
        <StatCard
          label="Active Authors"
          value={data.totalAuthors.toLocaleString()}
          icon={Users}
          accent="text-amber-700 dark:text-amber-400"
        />
      </div>

      {/* 30-day views trend */}
      <section className="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <header className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-stone-700 dark:text-stone-300" />
              30-day Views Trend
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Daily article views over the last 30 days
            </p>
          </div>
          <div className="text-right">
            <div className="font-headline text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-50">
              {data.totalViews30d.toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
              total views
            </div>
          </div>
        </header>
        <ViewsTrendChart trend={data.viewsTrend} />
      </section>

      {/* Top categories */}
      <section className="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <header className="mb-5">
          <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Layers className="h-4 w-4 text-stone-700 dark:text-stone-300" />
            Top Categories by Views (30d)
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            How each section is performing with readers
          </p>
        </header>
        {data.topCategories.length === 0 ? (
          <EmptyState icon={Layers} title="No category data" description="No article views in the last 30 days." />
        ) : (
          <CategoryBars categories={data.topCategories} />
        )}
      </section>

      {/* Two tables: most viewed + most commented */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArticleListCard
          title="Most Viewed Articles"
          subtitle="Top 10 by total views"
          icon={Eye}
          accent="text-stone-700 dark:text-stone-300"
          empty="No articles with views yet."
          rows={data.mostViewed.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            category: a.category,
            primary: `${a.viewCount.toLocaleString()} views`,
            secondary: `${a.commentCount.toLocaleString()} comments`,
            publishedAt: a.publishedAt,
          }))}
        />
        <ArticleListCard
          title="Most Commented Articles"
          subtitle="Top 10 by total comments"
          icon={MessageSquare}
          accent="text-stone-700 dark:text-stone-300"
          empty="No articles with comments yet."
          rows={data.mostCommented.map((a) => ({
            id: a.id,
            slug: a.slug,
            title: a.title,
            category: a.category,
            primary: `${a.commentCount.toLocaleString()} comments`,
            secondary: `${a.viewCount.toLocaleString()} views`,
            publishedAt: null,
          }))}
        />
      </div>

      {/* Top authors */}
      <section className="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <header className="border-b border-stone-200 dark:border-stone-800 px-5 py-4">
          <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            Top Authors
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Editors ranked by published article count and lifetime views
          </p>
        </header>
        {data.topAuthors.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No published authors yet" description="When editors publish articles, they'll appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Author</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Published</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Total Views</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Avg. Views / Article</th>
                </tr>
              </thead>
              <tbody>
                {data.topAuthors.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-200">
                          {(a.byline ?? a.name ?? "?")[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-stone-900 dark:text-stone-100">
                          {a.byline ?? a.name ?? "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                      {a.publishedCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                      {a.totalViews.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                      {a.publishedCount > 0
                        ? Math.round(a.totalViews / a.publishedCount).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function ViewsTrendChart({ trend }: { trend: AdminAnalyticsData["viewsTrend"] }) {
  if (trend.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No view data yet"
        description="No article views have been recorded in the last 30 days."
      />
    );
  }
  const max = Math.max(1, ...trend.map((d) => d.count));
  return (
    <div className="w-full">
      <div className="flex items-end gap-1 h-32 md:h-44">
        {trend.map((d, i) => {
          const height = Math.max(2, Math.round((d.count / max) * 100));
          const showLabel = i % 5 === 0 || i === trend.length - 1;
          return (
            <div
              key={d.day}
              className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0"
            >
              <div
                className="w-full rounded-t bg-stone-800 dark:bg-stone-200 transition-all hover:bg-rose-700 dark:hover:bg-rose-400"
                style={{ height: `${height}%` }}
                title={`${formatDate(d.day)}: ${d.count.toLocaleString()} views`}
              />
              {showLabel && (
                <div className="text-[9px] text-stone-500 dark:text-stone-400 whitespace-nowrap">
                  {formatDate(d.day).split(",")[0]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryBars({
  categories,
}: {
  categories: AdminAnalyticsData["topCategories"];
}) {
  const max = Math.max(1, ...categories.map((c) => c.views));
  // Tailwind color palette per category (deterministic by index).
  const palette = [
    "bg-rose-700 dark:bg-rose-400",
    "bg-emerald-600 dark:bg-emerald-400",
    "bg-amber-500 dark:bg-amber-400",
    "bg-stone-800 dark:bg-stone-200",
    "bg-stone-700 dark:bg-stone-300",
    "bg-stone-600 dark:bg-stone-400",
    "bg-stone-500 dark:bg-stone-500",
    "bg-stone-400 dark:bg-stone-600",
  ];
  // Ensure all 8 categories are present even if zero.
  const present = new Set(categories.map((c) => c.category));
  const full: AdminAnalyticsData["topCategories"] = [
    ...categories,
    ...ARTICLE_CATEGORIES.filter((c) => !present.has(c)).map((c) => ({
      category: c,
      views: 0,
      articles: 0,
    })),
  ];
  return (
    <ul className="space-y-3">
      {full.map((c, i) => {
        const pct = Math.round((c.views / max) * 100);
        return (
          <li key={c.category}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {titleCase(c.category)}
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {c.articles} articles
                </span>
              </div>
              <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
                {c.views.toLocaleString()} views
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${palette[i % palette.length]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

interface ArticleListRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  primary: string;
  secondary: string;
  publishedAt: string | null;
}

function ArticleListCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  empty,
  rows,
}: {
  title: string;
  subtitle: string;
  icon: typeof Eye;
  accent: string;
  empty: string;
  rows: ArticleListRow[];
}) {
  return (
    <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
      <header className="border-b border-stone-200 dark:border-stone-800 px-5 py-4">
        <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accent}`} />
          {title}
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          {subtitle}
        </p>
      </header>
      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={Icon} title={empty} />
        </div>
      ) : (
        <ol className="divide-y divide-stone-200 dark:divide-stone-800 max-h-96 overflow-y-auto">
          {rows.map((r, i) => (
            <li key={r.id} className="px-5 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-xs font-bold text-stone-400 dark:text-stone-600 tabular-nums">
                    #{i + 1}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierBadgeClass(
                      "digital"
                    )}`}
                  >
                    {titleCase(r.category)}
                  </span>
                </div>
                <a
                  href={`/article/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1 text-sm font-medium text-stone-900 dark:text-stone-100 hover:text-rose-700 dark:hover:text-rose-400 truncate"
                >
                  {r.title}
                </a>
                <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  {r.publishedAt ? `Published ${formatDate(r.publishedAt)}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-50 tabular-nums">
                  {r.primary}
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 tabular-nums">
                  {r.secondary}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
