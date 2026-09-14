import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminForbidden } from "@/components/admin/forbidden";
import { AdminCommentsView } from "@/components/admin/comments-view";

export const metadata: Metadata = {
  title: "Comment Moderation — The Daily Post Admin",
  description: "Review, search, and moderate reader comments across all articles.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin comment moderation queue.
 *
 * Lists ALL comments (not just reported ones — that's /admin/reports).
 * Each row shows: article, author, body (truncated), date, upvotes,
 * report count, and action buttons (delete comment + dismiss reports).
 *
 * Filters: search by author/body, filter by articleSlug, sort by date
 * / upvotes / report-count.
 */
export default async function AdminCommentsPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return <AdminForbidden signedIn={Boolean(session)} />;
  }

  // Fetch the 200 most recent comments with their report counts in one
  // query via the `_count` aggregation. We don't paginate server-side
  // — the client filters/sorts the 200-row list, which is fast enough
  // for a moderation queue.
  const [comments, pendingCount] = await Promise.all([
    db.comment.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        articleSlug: true,
        author: true,
        body: true,
        upvotes: true,
        createdAt: true,
        parentId: true,
        _count: {
          select: { reports: true }, // report count for this comment
        },
      },
    }),
    db.commentReport.count(),
  ]);

  // Serialize dates to ISO strings for the client boundary.
  const serialized = comments.map((c) => ({
    id: c.id,
    articleSlug: c.articleSlug,
    author: c.author,
    body: c.body,
    upvotes: c.upvotes,
    createdAt: c.createdAt.toISOString(),
    parentId: c.parentId,
    reportCount: c._count.reports,
  }));

  // Distinct article slugs for the filter dropdown.
  const articleSlugs = Array.from(
    new Set(comments.map((c) => c.articleSlug))
  ).sort();

  return (
    <AdminCommentsView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
      comments={serialized}
      articleSlugs={articleSlugs}
      pendingReportCount={pendingCount}
    />
  );
}
