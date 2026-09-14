"use client";

/**
 * Admin area shell.
 *
 * Wraps the shared `DashboardShell` with the admin sidebar nav (Dashboard,
 * Review Queue, Articles, Users, Subscriptions, Payments, Analytics, plus
 * the legacy Reports / Typos / Subscribers routes) and wires the `signOut`
 * action from the unified auth provider.
 *
 * Brand icon: ShieldCheck. Accent color: text-rose-700.
 */

import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardCheck,
  Newspaper,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  Flag,
  Type,
  Mail,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import { DashboardShell, type NavItem } from "@/components/dashboard/shell";
import { useUnifiedAuth } from "@/components/unified-auth-provider";

export interface AdminShellUser {
  name: string | null;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reviews", label: "Review Queue", icon: ClipboardCheck },
  { href: "/admin/articles", label: "Articles", icon: Newspaper },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/docs", label: "Docs Lookup", icon: BookOpen },
  // Legacy routes (preserved from earlier phases).
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/typos", label: "Typos", icon: Type },
  { href: "/admin/subscribers", label: "Subscribers", icon: Mail },
];

export function AdminShell({
  user,
  navBadge,
  children,
}: {
  user: AdminShellUser;
  navBadge?: { href: string; count: number }[];
  children: React.ReactNode;
}) {
  const { signOut } = useUnifiedAuth();

  const nav: NavItem[] = NAV.map((item) => {
    const badge = navBadge?.find((b) => b.href === item.href);
    if (badge && badge.count > 0) {
      return { ...item, badge: badge.count };
    }
    return item;
  });

  return (
    <DashboardShell
      brand={{
        label: "Admin Console",
        icon: ShieldCheck,
        accent: "text-rose-700",
      }}
      nav={nav}
      user={user}
      signOut={signOut}
    >
      {children}
    </DashboardShell>
  );
}
