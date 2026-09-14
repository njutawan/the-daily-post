import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { MemberHistoryView } from "@/components/member/history-view";
import { SignInRequiredCard } from "@/components/member/sign-in-required";
import type { HistoryItem, MemberUser } from "@/components/member/types";

export const metadata: Metadata = {
  title: "Reading History — The Daily Post",
  description: "Articles you've read recently, with progress saved.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MemberHistoryPage() {
  const session = await getSessionUser();
  if (!session) {
    return <SignInRequiredCard />;
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, email: true, name: true, role: true,
      subTier: true, subStatus: true, subExpiresAt: true, avatarUrl: true,
      byline: true, bio: true, createdAt: true,
    },
  });
  if (!dbUser) return <SignInRequiredCard />;

  const user: MemberUser = {
    id: dbUser.id, email: dbUser.email, name: dbUser.name, role: dbUser.role,
    subTier: dbUser.subTier as MemberUser["subTier"],
    subStatus: dbUser.subStatus as MemberUser["subStatus"],
    subExpiresAt: dbUser.subExpiresAt?.toISOString() ?? null,
    avatarUrl: dbUser.avatarUrl, byline: dbUser.byline, bio: dbUser.bio,
    createdAt: dbUser.createdAt.toISOString(),
  };

  const rows = await db.readingHistory.findMany({
    where: { userId: dbUser.id },
    orderBy: { lastReadAt: "desc" },
    take: 50,
    include: {
      article: {
        select: {
          id: true, slug: true, title: true, excerpt: true,
          category: true, heroImage: true, publishedAt: true,
        },
      },
    },
  });

  const history: HistoryItem[] = rows
    .filter((r) => r.article)
    .map((r) => ({
      articleId: r.article!.id,
      slug: r.article!.slug,
      title: r.article!.title,
      category: r.article!.category,
      heroImage: r.article!.heroImage,
      excerpt: r.article!.excerpt,
      publishedAt: r.article!.publishedAt?.toISOString() ?? null,
      progress: r.progress,
      lastReadAt: r.lastReadAt.toISOString(),
    }));

  return <MemberHistoryView user={user} history={history} />;
}
