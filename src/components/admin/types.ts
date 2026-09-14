/**
 * Shared types for admin area components.
 *
 * Server components fetch rows from Prisma and serialize them into these
 * plain types before passing them to client views. This keeps Date objects
 * out of the client boundary (which would break Next.js serialization).
 */

export type ArticleStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived";

export type ArticleCategory =
  | "politics"
  | "world"
  | "business"
  | "tech"
  | "opinion"
  | "sports"
  | "climate"
  | "culture";

export const ARTICLE_CATEGORIES: ArticleCategory[] = [
  "politics",
  "world",
  "business",
  "tech",
  "opinion",
  "sports",
  "climate",
  "culture",
];

export interface AdminUserLite {
  id: string;
  name: string | null;
  byline: string | null;
}

export interface AdminArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string;
  tags: string;
  heroImage: string | null;
  status: string;
  author: AdminUserLite;
  reviewer: AdminUserLite | null;
  reviewNotes: string | null;
  publishedAt: string | null;
  featured: boolean;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subTier: string;
  subStatus: string;
  subExpiresAt: string | null;
  avatarUrl: string | null;
  byline: string | null;
  createdAt: string;
  _count: { articles: number; payments: number };
}

export interface AdminPaymentRow {
  id: string;
  amount: number;
  currency: string;
  tier: string;
  billingCycle: string;
  status: string;
  provider: string;
  providerInvoice: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
}
