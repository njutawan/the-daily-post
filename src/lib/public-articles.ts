import { unstable_cache, revalidatePath, revalidateTag } from "next/cache";
import { allArticles, type Article } from "@/data/articles";
import { categories, getPublicCategoryName, getPublicCategorySlug } from "@/data/categories";
import { db } from "@/lib/db";
import { getArticleSlugs, getMDXArticle } from "@/lib/mdx-articles";

export const PUBLIC_ARTICLES_CACHE_TAG = "public-editorial-articles";
const PUBLIC_ARTICLES_CACHE_TTL_SECONDS = 300;

type PublicArticleAuthor = {
  id: string;
  name: string | null;
  byline: string | null;
  avatarUrl: string | null;
  role: string;
};

type PublishedEditorialArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  premium: boolean;
  category: string;
  tags: string;
  heroImage: string | null;
  heroCaption: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  featured: boolean;
  viewCount: number;
  commentCount: number;
  author: PublicArticleAuthor;
};

export type PublishedEditorialArticle = PublishedEditorialArticleSummary;

const publicArticleSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  premium: true,
  category: true,
  tags: true,
  heroImage: true,
  heroCaption: true,
  publishedAt: true,
  updatedAt: true,
  featured: true,
  viewCount: true,
  commentCount: true,
  author: {
    select: {
      id: true,
      name: true,
      byline: true,
      avatarUrl: true,
      role: true,
    },
  },
} as const;

const getCachedPublishedEditorialArticles = unstable_cache(
  async (): Promise<PublishedEditorialArticleSummary[]> =>
    db.article.findMany({
      where: { status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: publicArticleSelect,
    }),
  ["public-editorial-article-list-v1"],
  {
    revalidate: PUBLIC_ARTICLES_CACHE_TTL_SECONDS,
    tags: [PUBLIC_ARTICLES_CACHE_TAG],
  }
);

function relativeTime(date: Date): string {
  const elapsedHours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (elapsedHours < 1) return "just now";
  if (elapsedHours < 24) return `${elapsedHours} hour${elapsedHours === 1 ? "" : "s"} ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays} day${elapsedDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function publishedEditorialArticleToCard(
  article: PublishedEditorialArticleSummary
): Article {
  const publishedAt = article.publishedAt ?? article.updatedAt;
  const category = getPublicCategoryName(article.category);
  const author = article.author.byline?.trim() || article.author.name?.trim() || "The Daily Post Staff";

  return {
    slug: article.slug,
    title: article.title,
    deck: article.excerpt ?? "",
    category,
    author,
    authorTitle: article.author.role === "admin" ? "Editor-in-Chief" : undefined,
    authorAvatar: article.author.avatarUrl ?? undefined,
    time: relativeTime(publishedAt),
    publishedAt: publishedAt.toISOString(),
    readTime: 4,
    imageUrl: article.heroImage || "/images/capitol-1.jpg",
    imageCaption: article.heroCaption ?? undefined,
    premium: article.premium,
    layout: category === "Opinions" ? "opinion" : "standard",
  };
}

/** Published editorial summaries only; the body is never selected or returned. */
export async function getPublishedEditorialArticles(): Promise<Article[]> {
  try {
    const articles = await getCachedPublishedEditorialArticles();
    return articles.map((article) => publishedEditorialArticleToCard(article));
  } catch {
    // Keep the static newsroom available if the database is temporarily down.
    return [];
  }
}

/** Fresh, body-free details for metadata and per-request entitlement checks. */
export async function getPublishedEditorialArticleBySlug(
  slug: string
): Promise<PublishedEditorialArticle | null> {
  try {
    return await db.article.findFirst({
      where: { slug, status: "published" },
      select: publicArticleSelect,
    });
  } catch {
    return null;
  }
}

/**
 * Load body and current premium flag only after server-side access is granted.
 * Deliberately not cached; the caller rechecks access if premium changed while
 * the request was in flight.
 */
export async function getPublishedEditorialArticleBodyBySlug(
  slug: string
): Promise<{ body: string; premium: boolean } | null> {
  try {
    return await db.article.findFirst({
      where: { slug, status: "published" },
      select: { body: true, premium: true },
    });
  } catch {
    return null;
  }
}

function mdxArticleToCard(slug: string): Article | null {
  const article = getMDXArticle(slug);
  if (!article) return null;
  return {
    slug: article.slug,
    title: article.title,
    deck: article.deck,
    category: getPublicCategoryName(article.category),
    author: article.author,
    authorTitle: article.authorTitle,
    time: relativeTime(new Date(article.publishedAt)),
    publishedAt: article.publishedAt,
    readTime: article.readTime,
    imageUrl: article.imageUrl,
    imageCaption: article.imageCaption,
    imageCredit: article.imageCredit,
    breaking: article.breaking,
    premium: article.premium,
    layout: article.category.toLowerCase() === "opinions" ? "opinion" : "standard",
  };
}

/** Merge built-in, MDX, and published editorial content for public discovery. */
export async function getPublicArticleCatalog(): Promise<Article[]> {
  const merged = new Map<string, Article>();
  for (const article of allArticles) merged.set(article.slug, article);
  for (const slug of getArticleSlugs()) {
    const article = mdxArticleToCard(slug);
    if (article) merged.set(article.slug, article);
  }
  for (const article of await getPublishedEditorialArticles()) {
    // A published DB record is authoritative if its slug overlaps built-in content.
    merged.set(article.slug, article);
  }

  return [...merged.values()].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export async function searchPublicArticles(query: string): Promise<Article[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];
  const articles = await getPublicArticleCatalog();
  return articles.filter((article) =>
    [article.title, article.deck, article.author, article.category, article.authorTitle]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export type PublicArticleCacheReference = {
  slug?: string;
  category?: string;
  author?: {
    byline?: string | null;
    name?: string | null;
  };
};

function authorSlug(author: string): string {
  return author
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Invalidate published article data and every public route that consumes it. */
export function revalidatePublicArticleCaches(
  ...articles: PublicArticleCacheReference[]
): void {
  try {
    revalidateTag(PUBLIC_ARTICLES_CACHE_TAG, { expire: 0 });
    revalidateTag("popular", { expire: 0 });
    revalidateTag("most-read", { expire: 0 });
    revalidateTag("trending", { expire: 0 });

    const paths = new Set([
      "/",
      "/search",
      "/feed.xml",
      "/sitemap.xml",
      "/api/article-index",
    ]);
    for (const article of articles) {
      if (article.slug) {
        paths.add(`/article/${article.slug}`);
        paths.add(`/api/og/${article.slug}`);
      }
      if (article.category) {
        const categoryName = getPublicCategoryName(article.category);
        const category = getPublicCategorySlug(categoryName);
        paths.add(`/category/${category}`);
        paths.add(`/category/${category}/feed.xml`);
        if (categoryName === "Opinions") {
          paths.add("/category/opinion");
          paths.add("/category/opinion/feed.xml");
        }
      }
      const byline = article.author?.byline?.trim() || article.author?.name?.trim();
      if (byline) paths.add(`/author/${authorSlug(byline)}`);
    }

    for (const path of paths) revalidatePath(path);
  } catch (error) {
    // Publication should remain successful if cache invalidation is unavailable.
    console.error("[public-articles] cache revalidation failed", error);
  }
}

/** Public category counts computed from the merged article catalog. */
export async function getPublicCategoryCounts(): Promise<Array<{ name: string; count: number }>> {
  const articles = await getPublicArticleCatalog();
  return categories
    .filter((category) => category !== "Live")
    .map((name) => ({
      name,
      count: articles.filter((article) => article.category === name).length,
    }));
}
