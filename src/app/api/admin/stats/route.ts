import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/admin/stats — aggregated metrics for the admin dashboard.
 *
 * Returns:
 *  - counts by user role / subscription tier
 *  - article pipeline counts (draft / pending / published / rejected)
 *  - revenue totals (succeeded payments)
 *  - recent activity (last 30 days views, comments, new users)
 */
export async function GET(req: Request) {
  const user = await requireRole("admin" as Role);
  if (!user) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  // Rate limit: 30 req/min per IP+user (admin stats).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  try {
    // Run all the counts in parallel.
    const [
      totalUsers,
      totalEditors,
      totalAdmins,
      freeTier,
      digitalTier,
      allAccessTier,
      activeSubscribers,
      draftCount,
      pendingCount,
      publishedCount,
      rejectedCount,
      totalPayments,
      revenueAgg,
      recentViews,
      recentComments,
      recentUsers,
      pendingArticles,
      recentPayments,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "editor" } }),
      db.user.count({ where: { role: "admin" } }),
      db.user.count({ where: { subTier: "free" } }),
      db.user.count({ where: { subTier: "digital" } }),
      db.user.count({ where: { subTier: "allaccess" } }),
      db.user.count({ where: { subStatus: "active", subTier: { not: "free" } } }),
      db.article.count({ where: { status: "draft" } }),
      db.article.count({ where: { status: "pending_review" } }),
      db.article.count({ where: { status: "published" } }),
      db.article.count({ where: { status: "rejected" } }),
      db.payment.count({ where: { status: "succeeded" } }),
      db.payment.aggregate({
        where: { status: "succeeded" },
        _sum: { amount: true },
      }),
      db.articleView.count({
        where: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } },
      }),
      db.comment.count({
        where: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } },
      }),
      db.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } },
      }),
      db.article.findMany({
        where: { status: "pending_review" },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          author: { select: { id: true, name: true, byline: true } },
        },
      }),
      db.payment.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        editors: totalEditors,
        admins: totalAdmins,
        readers: totalUsers - totalEditors - totalAdmins,
      },
      subscriptions: {
        free: freeTier,
        digital: digitalTier,
        allaccess: allAccessTier,
        active: activeSubscribers,
      },
      articles: {
        draft: draftCount,
        pending: pendingCount,
        published: publishedCount,
        rejected: rejectedCount,
      },
      revenue: {
        totalSucceeded: revenueAgg._sum.amount ?? 0,
        paymentCount: totalPayments,
      },
      recent: {
        views30d: recentViews,
        comments30d: recentComments,
        newUsers30d: recentUsers,
      },
      pendingArticles: pendingArticles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category,
        author: a.author,
        updatedAt: a.updatedAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        tier: p.tier,
        billingCycle: p.billingCycle,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        user: p.user,
      })),
    });
  } catch (err) {
    logger.error({ err }, "[api/admin/stats] failed");
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
