import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { MemberSubscribeView } from "@/components/member/subscribe-view";
import { ClerkSignIn } from "@/components/clerk-sign-in";
import type { MemberUser, SubscriptionSummary } from "@/components/member/types";

export const metadata: Metadata = {
  title: "Subscription Plans — The Daily Post",
  description: "Choose your subscription plan and unlock unlimited articles.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAID_PLANS = new Set(["digital", "digital-annual", "allaccess"]);

type PageProps = {
  searchParams: Promise<{ plan?: string; checkout?: string }>;
};

export default async function MemberSubscribePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const requestedPlan = query.plan && PAID_PLANS.has(query.plan) ? query.plan : null;
  const initialPlan = query.checkout === "cancelled" ? null : requestedPlan;

  const session = await getSessionUser();
  if (!session) {
    const returnTo = initialPlan
      ? `/member/subscribe?plan=${encodeURIComponent(initialPlan)}`
      : "/member/subscribe";
    return <ClerkSignIn redirectUrl={returnTo} />;
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
      stripeSubscriptionId: true,
      subCancelAtPeriodEnd: true,
      avatarUrl: true,
      byline: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!dbUser) {
    return <ClerkSignIn redirectUrl={initialPlan ? `/member/subscribe?plan=${encodeURIComponent(initialPlan)}` : "/member/subscribe"} />;
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
    hasStripeSubscription: Boolean(dbUser.stripeSubscriptionId),
    cancelAtPeriodEnd: dbUser.subCancelAtPeriodEnd,
  };

  return (
    <MemberSubscribeView
      user={user}
      subscription={subscription}
      initialPlan={initialPlan as "digital" | "digital-annual" | "allaccess" | null}
    />
  );
}
