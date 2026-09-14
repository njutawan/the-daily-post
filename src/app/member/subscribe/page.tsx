import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { MemberSubscribeView } from "@/components/member/subscribe-view";
import { SignInRequiredCard } from "@/components/member/sign-in-required";
import type { MemberUser, SubscriptionSummary } from "@/components/member/types";

export const metadata: Metadata = {
  title: "Subscription Plans — The Daily Post",
  description: "Choose your subscription plan and unlock unlimited articles.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MemberSubscribePage() {
  const session = await getSessionUser();
  if (!session) {
    return <SignInRequiredCard />;
  }

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
    return <SignInRequiredCard />;
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

  return <MemberSubscribeView user={user} subscription={subscription} />;
}
