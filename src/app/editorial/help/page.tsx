import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { SignInRequired, ForbiddenRole } from "../Guards";
import { HelpClient } from "./HelpClient";
import type { EditorUser } from "../types";

export const metadata: Metadata = {
  title: "Help — Editor — The Daily Post",
  description: "Editorial guidelines, the article workflow, and a pre-submission checklist for editors.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const user = await getSessionUser();
  if (!user) return <SignInRequired redirect="/editorial/help" />;
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
    <HelpClient
      user={editorUser}
      badges={{ drafts: draftsCount, pending: pendingCount }}
    />
  );
}
