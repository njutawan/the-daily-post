"use client";

import { useUnifiedAuth } from "@/components/unified-auth-provider";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { EDITOR_BRAND, buildEditorNav } from "./editor-nav";

/**
 * Shared shell for the /editor workspace. Wraps the dashboard shell with
 * the editor brand + nav + signOut wiring so individual pages don't repeat
 * the boilerplate.
 *
 * Pages pass the server-fetched `user` (so there is no loading flash on
 * first paint) plus optional badge counts. The `signOut` callback comes
 * from `useUnifiedAuth()` so the local session cookie is cleared and the
 * user is redirected to the homepage.
 */
export interface EditorShellUser {
  name: string | null;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

interface EditorShellProps {
  user: EditorShellUser;
  badges?: { drafts?: number; pending?: number };
  nav?: NavItem[];
  children: React.ReactNode;
}

export function EditorShell({ user, badges, nav, children }: EditorShellProps) {
  const { signOut } = useUnifiedAuth();
  const items = nav ?? buildEditorNav(badges);

  return (
    <DashboardShell
      brand={EDITOR_BRAND}
      nav={items}
      user={user}
      signOut={signOut}
    >
      {children}
    </DashboardShell>
  );
}
