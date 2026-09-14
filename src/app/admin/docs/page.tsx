import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth-unified";
import { AdminForbidden } from "@/components/admin/forbidden";
import { AdminDocsView } from "@/components/admin/docs-view";

export const metadata: Metadata = {
  title: "Library Docs — The Daily Post Admin",
  description: "Look up documentation for any library via Context7.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Admin documentation lookup — Context7-powered library docs search.
 *
 * Useful for reporters + editors writing tech coverage who need to
 * reference library docs inline (no context-switch to MDN).
 */
export default async function AdminDocsPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return <AdminForbidden signedIn={Boolean(session)} />;
  }

  return (
    <AdminDocsView
      user={{
        name: session.name,
        email: session.email,
        role: session.role,
        avatarUrl: session.avatarUrl,
      }}
    />
  );
}
