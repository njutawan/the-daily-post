import {
  LayoutDashboard,
  FileText,
  Plus,
  HelpCircle,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/components/dashboard/shell";

/**
 * Brand definition used by the shared DashboardShell in the /editor area.
 * `accent` matches the amber editor color used across the workspace.
 */
export const EDITOR_BRAND = {
  label: "Editor",
  icon: PenLine,
  accent: "text-amber-700",
} as const;

/**
 * Shared sidebar nav for the /editor workspace.
 *
 * `badges` (optional) lets pages pass live counts so the sidebar can
 * surface actionable numbers (e.g. drafts to finish, articles awaiting
 * admin review).
 */
export function buildEditorNav(badges?: {
  drafts?: number;
  pending?: number;
}): NavItem[] {
  return [
    {
      href: "/editorial",
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: badges?.pending,
    },
    {
      href: "/editorial/articles",
      label: "My Articles",
      icon: FileText,
      badge: badges?.drafts,
    },
    {
      href: "/editorial/articles/new",
      label: "New Article",
      icon: Plus,
    },
    {
      href: "/editorial/help",
      label: "Help",
      icon: HelpCircle,
    },
  ];
}
