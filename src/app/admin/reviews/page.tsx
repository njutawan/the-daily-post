import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminReviewsView } from "@/components/admin/reviews-view";
import { AdminForbidden } from "@/components/admin/forbidden";
import type { AdminArticleRow } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Review Queue — The Daily Post Admin",
  description: "Approve, request changes, or reject articles submitted by editors.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return <AdminForbidden signedIn={Boolean(session)} />;
  }

  const [pendingCount, articleRows] = await Promise.all([
    db.article.count({ where: { status: "pending_review" } }),
    db.article.findMany({
      where: { status: "pending_review" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        author: { select: { id: true, name: true, byline: true } },
      },
    }),
  ]);

  const articles: AdminArticleRow[] = articleRows.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    category: a.category,
    tags: a.tags,
    heroImage: a.heroImage,
    status: a.status,
    author: {
      id: a.author.id,
      name: a.author.name,
      byline: a.author.byline,
    },
    reviewer: null,
    reviewNotes: a.reviewNotes,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    featured: a.featured,
    viewCount: a.viewCount,
    commentCount: a.commentCount,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <AdminReviewsView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
      pendingCount={pendingCount}
      articles={articles}
    />
  );
}
