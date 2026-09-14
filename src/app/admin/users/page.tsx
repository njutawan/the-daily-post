import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminUsersView } from "@/components/admin/users-view";
import { AdminForbidden } from "@/components/admin/forbidden";
import type { AdminUserRow } from "@/components/admin/types";

export const metadata: Metadata = {
  title: "Users — The Daily Post Admin",
  description: "Manage roles, subscription tier, status, and editorial byline for every user.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return <AdminForbidden signedIn={Boolean(session)} />;
  }

  const [pendingCount, userRows] = await Promise.all([
    db.article.count({ where: { status: "pending_review" } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
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
        createdAt: true,
        _count: { select: { articles: true, payments: true } },
      },
    }),
  ]);

  const users: AdminUserRow[] = userRows.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    subTier: u.subTier,
    subStatus: u.subStatus,
    subExpiresAt: u.subExpiresAt?.toISOString() ?? null,
    avatarUrl: u.avatarUrl,
    byline: u.byline,
    createdAt: u.createdAt.toISOString(),
    _count: {
      articles: u._count.articles,
      payments: u._count.payments,
    },
  }));

  return (
    <AdminUsersView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
      pendingCount={pendingCount}
      users={users}
      currentUserId={session.id}
    />
  );
}
