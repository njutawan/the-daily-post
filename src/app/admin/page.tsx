import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminDashboardView } from "@/components/admin/dashboard-view";
import type { AdminDashboardStats } from "@/components/admin/dashboard-view";
import { AdminForbidden } from "@/components/admin/forbidden";
import { ClerkSignIn } from "@/components/clerk-sign-in";
import type { AdminArticleRow, AdminPaymentRow } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Admin Dashboard — The Daily Post",
  description: "Comprehensive overview of users, articles, revenue, and engagement.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getSessionUser();
  if (!session) {
    return <ClerkSignIn redirectUrl="/admin" />;
  }
  if (session.role !== "admin") {
    return <AdminForbidden signedIn />;
  }

  // Run all the independent queries in parallel.
  const [
    usersTotal,
    usersEditors,
    usersAdmins,
    subsFree,
    subsDigital,
    subsAllAccess,
    activeSubscribers,
    articlesDraft,
    articlesPending,
    articlesPublished,
    articlesRejected,
    revenueAgg,
    revenueCount,
    recentViews,
    recentComments,
    recentUsers,
    pendingArticlesRows,
    recentPaymentRows,
    legacyCommentReports,
    legacyTypoReports,
    legacySubscribers,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "editor" } }),
    db.user.count({ where: { role: "admin" } }),
    db.user.count({ where: { subTier: "free" } }),
    db.user.count({ where: { subTier: "digital" } }),
    db.user.count({ where: { subTier: "allaccess" } }),
    db.user.count({
      where: { subStatus: "active", subTier: { not: "free" } },
    }),
    db.article.count({ where: { status: "draft" } }),
    db.article.count({ where: { status: "pending_review" } }),
    db.article.count({ where: { status: "published" } }),
    db.article.count({ where: { status: "rejected" } }),
    db.payment.aggregate({
      where: { status: "succeeded" },
      _sum: { amount: true },
    }),
    db.payment.count({ where: { status: "succeeded" } }),
    db.articleView.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
    }),
    db.comment.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
    }),
    db.user.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
    }),
    db.article.findMany({
      where: { status: "pending_review" },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        author: { select: { id: true, name: true, byline: true } },
      },
    }),
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.commentReport.count(),
    db.typoReport.count({ where: { status: "pending" } }),
    db.subscriber.count(),
  ]);

  const stats: AdminDashboardStats = {
    usersTotal,
    usersEditors,
    usersAdmins,
    usersReaders: usersTotal - usersEditors - usersAdmins,
    subsFree,
    subsDigital,
    subsAllAccess,
    activeSubscribers,
    articlesDraft,
    articlesPending,
    articlesPublished,
    articlesRejected,
    revenueTotal: revenueAgg._sum.amount ?? 0,
    revenueCount,
    recentViews30d: recentViews,
    recentComments30d: recentComments,
    recentNewUsers30d: recentUsers,
    legacyCommentReports,
    legacyTypoReports,
    legacySubscribers,
  };

  const pendingArticles: AdminArticleRow[] = pendingArticlesRows.map((a) => ({
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

  const recentPayments: AdminPaymentRow[] = recentPaymentRows.map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    tier: p.tier,
    billingCycle: p.billingCycle,
    status: p.status,
    provider: p.provider,
    providerInvoice: p.providerInvoice,
    createdAt: p.createdAt.toISOString(),
    user: {
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
    },
  }));

  return (
    <AdminDashboardView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
      stats={stats}
      pendingArticles={pendingArticles}
      recentPayments={recentPayments}
    />
  );
}
