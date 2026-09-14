import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { ForbiddenRole } from "./Guards";
import { ClerkSignIn } from "@/components/clerk-sign-in";
import { EditorDashboardClient } from "./EditorDashboardClient";
import type {
  EditorArticleSummary,
  EditorStats,
  EditorUser,
} from "./types";
import type { ArticleStatus } from "./StatusBadge";

export const metadata: Metadata = {
  title: "Editor Dashboard — The Daily Post",
  description:
    "Overview of your drafts, articles in review, published work, and feedback from the editorial team.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function serializeArticle(a: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  category: string;
  tags: string;
  heroImage: string | null;
  updatedAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
  viewCount: number;
  commentCount: number;
  reviewNotes: string | null;
  reviewer?: { name: string | null } | null;
}): EditorArticleSummary {
  return {
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
  };
}

export default async function EditorDashboardPage() {
  const user = await getSessionUser();
  if (!user) return <ClerkSignIn redirectUrl="/editorial" />;
  if (user.role !== "editor" && user.role !== "admin") return <ForbiddenRole />;

  // Fetch counts + recent activity in parallel for a snappy server render.
  const [
    draftsCount,
    pendingCount,
    publishedCount,
    rejectedCount,
    recentRaw,
    feedbackRaw,
  ] = await Promise.all([
    db.article.count({
      where: { authorId: user.id, status: "draft" },
    }),
    db.article.count({
      where: { authorId: user.id, status: "pending_review" },
    }),
    db.article.count({
      where: { authorId: user.id, status: "published" },
    }),
    db.article.count({
      where: { authorId: user.id, status: "rejected" },
    }),
    db.article.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        status: true,
        category: true,
        tags: true,
        heroImage: true,
        updatedAt: true,
        createdAt: true,
        publishedAt: true,
        viewCount: true,
        commentCount: true,
        reviewNotes: true,
      },
    }),
    db.article.findMany({
      where: {
        authorId: user.id,
        // Articles that have admin feedback notes (rejections / change requests).
        reviewNotes: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        reviewer: { select: { name: true } },
      },
    }),
  ]);

  const stats: EditorStats = {
    drafts: draftsCount,
    pending: pendingCount,
    published: publishedCount,
    rejected: rejectedCount,
  };

  const recent: EditorArticleSummary[] = recentRaw.map(serializeArticle);
  const feedback: EditorArticleSummary[] = feedbackRaw.map(serializeArticle);

  const editorUser: EditorUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as EditorUser["role"],
    avatarUrl: user.avatarUrl,
  };

  return (
    <EditorDashboardClient
      user={editorUser}
      stats={stats}
      recent={recent}
      feedback={feedback}
    />
  );
}
