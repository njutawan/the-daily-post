/**
 * Shared types for the /editor workspace.
 *
 * These shapes are used both by server components (which fetch data from
 * Prisma) and client components (which receive the data as props across
 * the RSC boundary). Date fields are typed as `string` (ISO) on the client
 * side because Prisma returns Date objects, but Next.js serializes them
 * to ISO strings when crossing the server→client boundary in props.
 */

import type { ArticleStatus } from "./StatusBadge";

export interface EditorUser {
  id: string;
  name: string | null;
  email: string;
  role: "reader" | "editor" | "admin";
  avatarUrl: string | null;
}

export interface EditorArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: ArticleStatus;
  category: string;
  tags: string;
  heroImage: string | null;
  updatedAt: string; // ISO
  createdAt: string; // ISO
  publishedAt: string | null; // ISO
  viewCount: number;
  commentCount: number;
  reviewNotes: string | null;
  reviewerName?: string | null;
}

export interface EditorArticleDetail extends EditorArticleSummary {
  body: string;
  heroCaption: string | null;
  authorId: string;
  reviewerId: string | null;
  reviews: ArticleReviewEntry[];
}

export interface ArticleReviewEntry {
  id: string;
  action: "approved" | "rejected" | "requested_changes";
  notes: string | null;
  createdAt: string; // ISO
  reviewerName: string | null;
}

export interface EditorStats {
  drafts: number;
  pending: number;
  published: number;
  rejected: number;
}

export const ARTICLE_CATEGORIES = [
  "politics",
  "world",
  "business",
  "tech",
  "opinion",
  "sports",
  "climate",
  "culture",
] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  politics: "Politics",
  world: "World",
  business: "Business",
  tech: "Tech",
  opinion: "Opinion",
  sports: "Sports",
  climate: "Climate",
  culture: "Culture",
};
