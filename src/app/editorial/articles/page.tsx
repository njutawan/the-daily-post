import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { SignInRequired, ForbiddenRole } from "../Guards";
import { ArticlesListClient } from "./ArticlesListClient";
import type {
  EditorArticleSummary,
  EditorStats,
  EditorUser,
} from "../types";
import type { ArticleStatus } from "../StatusBadge";

export const metadata: Metadata = {
  title: "My Articles — Editor — The Daily Post",
  description:
    "All articles you have written for The Daily Post. Filter by status or category, search by title, and edit, submit, or delete drafts.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MyArticlesPage() {
  const user = await getSessionUser();
  if (!user) return <SignInRequired redirect="/editorial/articles" />;
  if (user.role !== "editor" && user.role !== "admin") return <ForbiddenRole />;

  const [articles, draftsCount, pendingCount] = await Promise.all([
    db.article.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        reviewer: { select: { name: true } },
      },
    }),
    db.article.count({
      where: { authorId: user.id, status: "draft" },
    }),
    db.article.count({
      where: { authorId: user.id, status: "pending_review" },
    }),
  ]);

  const serialized: EditorArticleSummary[] = articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    status: a.status as ArticleStatus,
    category: a.category,
    tags: a.tags,
    heroImage: a.heroImage,
    updatedAt: a.updatedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    viewCount: a.viewCount,
    commentCount: a.commentCount,
    reviewNotes: a.reviewNotes,
    reviewerName: a.reviewer?.name ?? null,
  }));

  const stats: EditorStats = {
    drafts: draftsCount,
    pending: pendingCount,
    published: 0,
    rejected: 0,
  };

  const editorUser: EditorUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as EditorUser["role"],
    avatarUrl: user.avatarUrl,
  };

  return (
    <ArticlesListClient
      user={editorUser}
      articles={serialized}
      stats={stats}
    />
  );
}
