import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminAnalyticsView } from "@/components/admin/analytics-view";
import type { AdminAnalyticsData } from "@/components/admin/analytics-view";
import { AdminForbidden } from "@/components/admin/forbidden";
import { ARTICLE_CATEGORIES } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Analytics — The Daily Post Admin",
  description: "Readership, engagement, and editorial productivity analytics.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function dayKey(d: Date): string {
  // YYYY-MM-DD in UTC (consistent bucketing regardless of viewer TZ).
  return d.toISOString().slice(0, 10);
}

export default async function AdminAnalyticsPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return <AdminForbidden signedIn={Boolean(session)} />;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);

  // Build a 30-day bucket scaffold (oldest → newest).
  const buckets: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 1000 * 60 * 60 * 24);
    buckets[dayKey(d)] = 0;
  }

  const [pendingCount, viewRows, commentCount30d, publishedArticles] = await Promise.all([
    db.article.count({ where: { status: "pending_review" } }),
    db.articleView.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    db.comment.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
    db.article.count({ where: { status: "published" } }),
  ]);

  for (const v of viewRows) {
    const key = dayKey(v.createdAt);
    if (key in buckets) buckets[key] += 1;
  }

  const viewsTrend: AdminAnalyticsData["viewsTrend"] = Object.entries(buckets).map(
    ([day, count]) => ({
      day: new Date(day + "T00:00:00Z").toISOString(),
      count,
    })
  );

  // Most viewed + most commented — both from the denormalized Article stats.
  const [mostViewedRows, mostCommentedRows, publishedWithAuthor] = await Promise.all([
    db.article.findMany({
      where: { status: "published" },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: {
        id: true, slug: true, title: true, viewCount: true,
        commentCount: true, publishedAt: true, category: true,
      },
    }),
    db.article.findMany({
      where: { status: "published" },
      orderBy: { commentCount: "desc" },
      take: 10,
      select: {
        id: true, slug: true, title: true, commentCount: true,
        viewCount: true, category: true,
      },
    }),
    db.article.findMany({
      where: { status: "published" },
      include: {
        author: { select: { id: true, name: true, byline: true } },
      },
    }),
  ]);

  // Top categories by views — group published articles by category and sum viewCount.
  const categoryMap: Record<string, { views: number; articles: number }> = {};
  for (const c of ARTICLE_CATEGORIES) {
    categoryMap[c] = { views: 0, articles: 0 };
  }
  for (const a of publishedWithAuthor) {
    const cat = a.category in categoryMap ? a.category : "politics";
    categoryMap[cat].views += a.viewCount;
    categoryMap[cat].articles += 1;
  }
  const topCategories: AdminAnalyticsData["topCategories"] = Object.entries(categoryMap)
    .map(([category, v]) => ({ category, views: v.views, articles: v.articles }))
    .sort((a, b) => b.views - a.views);

  // Top authors — group by author.
  const authorMap: Record<
    string,
    { id: string; name: string | null; byline: string | null; publishedCount: number; totalViews: number }
  > = {};
  for (const a of publishedWithAuthor) {
    const id = a.author?.id ?? "unknown";
    if (!authorMap[id]) {
      authorMap[id] = {
        id,
        name: a.author?.name ?? null,
        byline: a.author?.byline ?? null,
        publishedCount: 0,
        totalViews: 0,
      };
    }
    authorMap[id].publishedCount += 1;
    authorMap[id].totalViews += a.viewCount;
  }
  const topAuthors: AdminAnalyticsData["topAuthors"] = Object.values(authorMap).sort(
    (a, b) =>
      b.publishedCount - a.publishedCount || b.totalViews - a.totalViews
  );

  const totalViews30d = viewRows.length;
  const totalAuthors = Object.keys(authorMap).length;

  const data: AdminAnalyticsData = {
    totalViews30d,
    totalComments30d: commentCount30d,
    publishedArticles,
    totalAuthors,
    viewsTrend,
    topCategories,
    mostViewed: mostViewedRows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      viewCount: a.viewCount,
      commentCount: a.commentCount,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      category: a.category,
    })),
    mostCommented: mostCommentedRows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      commentCount: a.commentCount,
      viewCount: a.viewCount,
      category: a.category,
    })),
    topAuthors,
  };

  return (
    <AdminAnalyticsView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
      pendingCount={pendingCount}
      data={data}
    />
  );
}
