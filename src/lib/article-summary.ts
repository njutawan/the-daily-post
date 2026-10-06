import type { Article } from "@/data/articles";

/** Public article metadata safe to send to browsers; never includes full body text. */
export type ArticleSummary = Pick<
  Article,
  | "slug"
  | "title"
  | "deck"
  | "category"
  | "author"
  | "authorTitle"
  | "time"
  | "publishedAt"
  | "readTime"
  | "imageUrl"
  | "premium"
>;

export function toArticleSummary(article: Article): ArticleSummary {
  return {
    slug: article.slug,
    title: article.title,
    deck: article.deck,
    category: article.category,
    author: article.author,
    authorTitle: article.authorTitle,
    time: article.time,
    publishedAt: article.publishedAt,
    readTime: article.readTime,
    imageUrl: article.imageUrl,
    premium: Boolean(article.premium),
  };
}
