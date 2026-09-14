"use client";

/**
 * Member area shell.
 *
 * Wraps the shared `DashboardShell` with the member-area sidebar nav
 * (Dashboard, Subscription, Reading History, Saved, Profile, Billing)
 * and wires the `signOut` action from the unified auth provider.
 *
 * Pages pass already-serialized props (no Date objects) and children.
 */

import { BookOpen, LayoutDashboard, CreditCard, History, Bookmark, User, Receipt } from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { useUnifiedAuth, type SessionUser } from "@/components/unified-auth-provider";

export interface MemberShellUser {
  name: string | null;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

const NAV: NavItem[] = [
  { href: "/member", label: "Dashboard", icon: LayoutDashboard },
  { href: "/member/subscribe", label: "Subscription", icon: CreditCard },
  { href: "/member/history", label: "Reading History", icon: History },
  { href: "/member/saved", label: "Saved", icon: Bookmark },
  { href: "/member/profile", label: "Profile", icon: User },
  { href: "/member/billing", label: "Billing", icon: Receipt },
];

export function MemberShell({
  user,
  children,
}: {
  user: MemberShellUser;
  children: React.ReactNode;
}) {
  const { signOut } = useUnifiedAuth();

  return (
    <DashboardShell
      brand={{
        label: "Member Area",
        icon: BookOpen,
        accent: "text-emerald-700",
      }}
      nav={NAV}
      user={user}
      signOut={signOut}
    >
      {children}
    </DashboardShell>
  );
}

// Re-export for convenience.
export type { SessionUser };
