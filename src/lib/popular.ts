import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { allArticles } from "@/data/articles";
import type { Article } from "@/data/articles";

export type PopularArticle = Article & {
  views: number;
  commentCount: number;
  score: number;
};

/**
 * Returns the most popular articles in the last 7 days, ranked by a composite
 * score: views + (upvotes * 3) + (commentCount * 2).
 * Falls back to all articles if the DB is empty or unavailable.
 *
 * The underlying DB aggregation is cached for 1 hour via `unstable_cache`
 * — the popular-this-week list doesn't need to be fresher than that, and
 * caching avoids re-running the GROUP BY over the ArticleView table on
 * every homepage render.
 */
async function _getPopularThisWeek(limit: number): Promise<PopularArticle[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Aggregate views per article in the last 7 days
    const viewRows = await db.articleView.groupBy({
      by: ["articleSlug"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    // Aggregate comment counts + total upvotes per article
    const commentRows = await db.comment.groupBy({
      by: ["articleSlug"],
      _count: { _all: true },
      _sum: { upvotes: true },
    });

    const commentMap = new Map(
      commentRows.map((r) => [
        r.articleSlug,
        { count: r._count._all, upvotes: r._sum.upvotes || 0 },
      ])
    );

    // Build the ranked list
    const ranked: PopularArticle[] = [];
    for (const row of viewRows) {
      const article = allArticles.find((a) => a.slug === row.articleSlug);
      if (!article) continue;
      const views = row._count._all;
      const c = commentMap.get(row.articleSlug) || { count: 0, upvotes: 0 };
      const score = views + c.upvotes * 3 + c.count * 2;
      ranked.push({
        ...article,
        views,
        commentCount: c.count,
        score,
      });
    }

    // Sort by score descending
    ranked.sort((a, b) => b.score - a.score);

    // If we have fewer than `limit` with views, pad with articles that have comments
    if (ranked.length < limit) {
      for (const article of allArticles) {
        if (ranked.find((r) => r.slug === article.slug)) continue;
        const c = commentMap.get(article.slug) || { count: 0, upvotes: 0 };
        if (c.count > 0 || c.upvotes > 0) {
          ranked.push({
            ...article,
            views: 0,
            commentCount: c.count,
            score: c.upvotes * 3 + c.count * 2,
          });
        }
        if (ranked.length >= limit) break;
      }
    }

    return ranked.slice(0, limit);
  } catch (err) {
    console.error("[getPopularThisWeek] error", err);
    return [];
  }
}

/**
 * Cached version of `getPopularThisWeek`. Revalidates every hour — the
 * "popular this week" list doesn't change minute-to-minute.
 *
 * Tagged `popular` so we can manually revalidate when a new view/comment
 * is recorded (call `revalidateTag("popular")` from the view POST handler
 * if you want instant updates — currently we just let the 1h TTL expire).
 */
export const getPopularThisWeek = unstable_cache(_getPopularThisWeek, ["popular"], {
  revalidate: 3600, // 1 hour
});

/**
 * Returns the most-read articles of all time, ranked by total views.
 * Falls back to comment/upvote activity if there are no views yet.
 *
 * Cached for 1 hour.
 */
async function _getMostRead(limit: number): Promise<PopularArticle[]> {
  try {
    const viewRows = await db.articleView.groupBy({
      by: ["articleSlug"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 30,
    });

    const commentRows = await db.comment.groupBy({
      by: ["articleSlug"],
      _count: { _all: true },
      _sum: { upvotes: true },
    });

    const commentMap = new Map(
      commentRows.map((r) => [
        r.articleSlug,
        { count: r._count._all, upvotes: r._sum.upvotes || 0 },
      ])
    );

    const ranked: PopularArticle[] = [];
    for (const row of viewRows) {
      const article = allArticles.find((a) => a.slug === row.articleSlug);
      if (!article) continue;
      const views = row._count._all;
      const c = commentMap.get(row.articleSlug) || { count: 0, upvotes: 0 };
      ranked.push({
        ...article,
        views,
        commentCount: c.count,
        score: views,
      });
    }

    // Pad with comment-active articles if view data is sparse
    if (ranked.length < limit) {
      for (const article of allArticles) {
        if (ranked.find((r) => r.slug === article.slug)) continue;
        const c = commentMap.get(article.slug) || { count: 0, upvotes: 0 };
        if (c.count > 0 || c.upvotes > 0) {
          ranked.push({
            ...article,
            views: 0,
            commentCount: c.count,
            score: c.upvotes * 3 + c.count * 2,
          });
        }
        if (ranked.length >= limit) break;
      }
    }

    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, limit);
  } catch (err) {
    console.error("[getMostRead] error", err);
    return [];
  }
}

export const getMostRead = unstable_cache(_getMostRead, ["most-read"], {
  revalidate: 3600, // 1 hour
});

export type TrendingTopic = {
  category: string;
  views: number;
  articleCount: number;
};

/**
 * Returns the most-read categories this week (by views), with article counts.
 *
 * Cached for 1 hour — the "trending topics" list doesn't change minute-to-minute.
 * Tagged `trending` so we can manually revalidate from the views POST handler.
 */
async function _getTrendingTopics(limit: number): Promise<TrendingTopic[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    // Use groupBy instead of findMany — single round-trip + aggregates
    // at the DB level instead of pulling every row into Node.
    const grouped = await db.articleView.groupBy({
      by: ["articleSlug"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });

    // Map slugs to categories
    const slugToCategory = new Map(
      allArticles.map((a) => [a.slug, a.category])
    );

    // Count views per category
    const catViews = new Map<string, number>();
    const catSlugs = new Map<string, Set<string>>();
    for (const row of grouped) {
      const cat = slugToCategory.get(row.articleSlug);
      if (!cat) continue;
      const cnt = row._count._all;
      catViews.set(cat, (catViews.get(cat) || 0) + cnt);
      if (!catSlugs.has(cat)) catSlugs.set(cat, new Set());
      catSlugs.get(cat)!.add(row.articleSlug);
    }

    // If no views yet, fall back to article counts per category
    if (catViews.size === 0) {
      const catCounts = new Map<string, number>();
      for (const a of allArticles) {
        catCounts.set(a.category, (catCounts.get(a.category) || 0) + 1);
      }
      return Array.from(catCounts.entries())
        .map(([category, count]) => ({
          category,
          views: 0,
          articleCount: count,
        }))
        .sort((a, b) => b.articleCount - a.articleCount)
        .slice(0, limit);
    }

    return Array.from(catViews.entries())
      .map(([category, views]) => ({
        category,
        views,
        articleCount: catSlugs.get(category)?.size || 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  } catch (err) {
    console.error("[getTrendingTopics] error", err);
    return [];
  }
}

export const getTrendingTopics = unstable_cache(_getTrendingTopics, ["trending"], {
  revalidate: 3600, // 1 hour
});
