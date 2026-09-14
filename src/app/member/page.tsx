import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { MemberDashboardView } from "@/components/member/dashboard-view";
import type {
  ContinueReadingItem,
  DashboardStats,
  MemberUser,
  RecommendedArticle,
  SubscriptionSummary,
} from "@/components/member/types";
import { ClerkSignIn } from "@/components/clerk-sign-in";

export const metadata: Metadata = {
  title: "Member Dashboard — The Daily Post",
  description: "Your reading activity, subscription status, and recommendations.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function daysFromNow(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default async function MemberDashboardPage() {
  const session = await getSessionUser();
  if (!session) {
    return <ClerkSignIn redirectUrl="/member" />;
  }

  // Hydrate full user row from DB (for byline/bio/createdAt on profile,
  // not strictly needed here but consistent with other pages).
  const dbUser = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      subTier: true,
      subStatus: true,
      subExpiresAt: true,
      avatarUrl: true,
      byline: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    return <ClerkSignIn redirectUrl="/member" />;
  }

  const user: MemberUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    subTier: dbUser.subTier as MemberUser["subTier"],
    subStatus: dbUser.subStatus as MemberUser["subStatus"],
    subExpiresAt: dbUser.subExpiresAt?.toISOString() ?? null,
    avatarUrl: dbUser.avatarUrl,
    byline: dbUser.byline,
    bio: dbUser.bio,
    createdAt: dbUser.createdAt.toISOString(),
  };

  const subscription: SubscriptionSummary = {
    tier: dbUser.subTier as SubscriptionSummary["tier"],
    status: dbUser.subStatus as SubscriptionSummary["status"],
    expiresAt: dbUser.subExpiresAt?.toISOString() ?? null,
  };

  // Articles read in the last 30 days — count of distinct history entries
  // whose lastReadAt is within the window.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [readCount, savedCount, inProgress, recommendedRows] = await Promise.all([
    db.readingHistory.count({
      where: { userId: dbUser.id, lastReadAt: { gte: thirtyDaysAgo } },
    }),
    db.savedArticle.count({ where: { userId: dbUser.id } }),
    db.readingHistory.findMany({
      where: { userId: dbUser.id, progress: { lt: 100 } },
      orderBy: { lastReadAt: "desc" },
      take: 4,
      include: {
        article: {
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            category: true,
            heroImage: true,
          },
        },
      },
    }),
    db.article.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      take: 4,
      include: {
        author: { select: { name: true, byline: true } },
      },
    }),
  ]);

  const continueReading: ContinueReadingItem[] = inProgress
    .filter((r) => r.article)
    .map((r) => ({
      articleId: r.article!.id,
      slug: r.article!.slug,
      title: r.article!.title,
      excerpt: r.article!.excerpt,
      category: r.article!.category,
      heroImage: r.article!.heroImage,
      progress: r.progress,
      lastReadAt: r.lastReadAt.toISOString(),
    }));

  const recommended: RecommendedArticle[] = recommendedRows.map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    heroImage: a.heroImage,
    authorName: a.author?.byline ?? a.author?.name ?? null,
    publishedAt: a.publishedAt?.toISOString() ?? null,
  }));

  const stats: DashboardStats = {
    articlesRead30d: readCount,
    savedCount,
    currentPlan: dbUser.subTier,
    daysUntilRenewal:
      dbUser.subTier === "free" ? null : daysFromNow(dbUser.subExpiresAt?.toISOString() ?? null),
  };

  return (
    <MemberDashboardView
      user={user}
      subscription={subscription}
      stats={stats}
      continueReading={continueReading}
      recommended={recommended}
    />
  );
}
