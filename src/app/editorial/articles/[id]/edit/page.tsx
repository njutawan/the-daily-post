import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { ArticleNotFound, ForbiddenRole, SignInRequired } from "../../../Guards";
import { EditArticleClient } from "./EditArticleClient";
import type {
  ArticleReviewEntry,
  EditorArticleDetail,
  EditorStats,
  EditorUser,
} from "../../../types";
import type { ArticleStatus } from "../../../StatusBadge";

export const metadata: Metadata = {
  title: "Edit Article — Editor — The Daily Post",
  description: "Edit your draft, respond to reviewer feedback, and submit for review.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) return <SignInRequired redirect={`/editorial/articles/${id}/edit`} />;
  if (user.role !== "editor" && user.role !== "admin") return <ForbiddenRole />;

  const article = await db.article.findUnique({
    where: { id },
    include: {
      reviewer: { select: { name: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { name: true } } },
      },
    },
  });

  if (!article) {
    return <ArticleNotFound reason="We couldn't find an article with that ID. It may have been deleted or the URL is wrong." />;
  }

  // Editors can only edit their own articles. Admins can edit anything.
  if (user.role === "editor" && article.authorId !== user.id) {
    return (
      <ArticleNotFound reason="This article was written by another editor. You can only edit articles you authored." />
    );
  }

  const reviews: ArticleReviewEntry[] = article.reviews.map((r) => ({
    id: r.id,
    action: r.action as ArticleReviewEntry["action"],
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    reviewerName: r.reviewer?.name ?? null,
  }));

  const detail: EditorArticleDetail = {
    id: article.id,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt,
    body: article.body,
    status: article.status as ArticleStatus,
    category: article.category,
    tags: article.tags,
    heroImage: article.heroImage,
    heroCaption: article.heroCaption,
    authorId: article.authorId,
    reviewerId: article.reviewerId,
    reviewNotes: article.reviewNotes,
    updatedAt: article.updatedAt.toISOString(),
    createdAt: article.createdAt.toISOString(),
    publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
    viewCount: article.viewCount,
    commentCount: article.commentCount,
    reviewerName: article.reviewer?.name ?? null,
    reviews,
  };

  const [draftsCount, pendingCount] = await Promise.all([
    db.article.count({
      where: { authorId: user.id, status: "draft" },
    }),
    db.article.count({
      where: { authorId: user.id, status: "pending_review" },
    }),
  ]);

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
    <EditArticleClient
      user={editorUser}
      article={detail}
      stats={stats}
    />
  );
}
