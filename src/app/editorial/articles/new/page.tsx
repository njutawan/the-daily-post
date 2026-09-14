import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { SignInRequired, ForbiddenRole } from "../../Guards";
import { NewArticleClient } from "./NewArticleClient";
import type { EditorUser } from "../../types";

export const metadata: Metadata = {
  title: "New Article — Editor — The Daily Post",
  description: "Compose a new draft article.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const user = await getSessionUser();
  if (!user) return <SignInRequired redirect="/editorial/articles/new" />;
  if (user.role !== "editor" && user.role !== "admin") return <ForbiddenRole />;

  const [draftsCount, pendingCount] = await Promise.all([
    db.article.count({
      where: { authorId: user.id, status: "draft" },
    }),
    db.article.count({
      where: { authorId: user.id, status: "pending_review" },
    }),
  ]);

  const editorUser: EditorUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as EditorUser["role"],
    avatarUrl: user.avatarUrl,
  };

  return (
    <NewArticleClient
      user={editorUser}
      badges={{ drafts: draftsCount, pending: pendingCount }}
    />
  );
}
