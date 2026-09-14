"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardShellProps {
  brand: {
    label: string;
    icon: LucideIcon;
    accent: string; // tailwind text color class, e.g. "text-rose-700"
  };
  nav: NavItem[];
  user: {
    name: string | null;
    email: string;
    role: string;
    avatarUrl?: string | null;
  };
  signOut: () => Promise<void>;
  children: React.ReactNode;
}

/**
 * Shared dashboard shell used by /admin, /editor, /member.
 *
 * Layout:
 *   +---------------------+----------------------------+
 *   |  Sidebar            |   Top bar (user + signout) |
 *   |  (sticky)           |----------------------------|
 *   |                     |   Page content             |
 *   |                     |                            |
 *   +---------------------+----------------------------+
 */
export function DashboardShell({
  brand,
  nav,
  user,
  signOut,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-stone-100 dark:bg-stone-950">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-stone-200 dark:border-stone-800">
          <brand.icon className={cn("h-7 w-7", brand.accent)} strokeWidth={2.2} />
          <div className="leading-tight">
            <div className="font-headline font-bold text-base text-stone-900 dark:text-stone-50">
              {brand.label}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
              The Daily Post
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium"
                    : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "" : "text-stone-500 dark:text-stone-400 group-hover:text-stone-700 dark:group-hover:text-stone-200"
                  )}
                  strokeWidth={2.2}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      active
                        ? "bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900"
                        : "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-200 dark:border-stone-800">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <span className="font-headline italic">← Back to The Daily Post</span>
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur px-4 md:px-6">
          <div className="md:hidden flex items-center gap-2">
            <brand.icon className={cn("h-6 w-6", brand.accent)} />
            <span className="font-headline font-bold text-stone-900 dark:text-stone-50">
              {brand.label}
            </span>
          </div>
          <div className="hidden md:block text-xs uppercase tracking-[0.18em] text-stone-500">
            {pathname.split("/").slice(2).join(" / ") || "Overview"}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden sm:inline text-xs uppercase tracking-[0.18em] text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            >
              View site →
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-800 pl-1 pr-3 py-1">
              <div className="h-7 w-7 rounded-full overflow-hidden bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-700 dark:text-stone-200">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user.name || user.email)[0]?.toUpperCase()
                )}
              </div>
              <div className="leading-tight hidden sm:block">
                <div className="text-xs font-medium text-stone-900 dark:text-stone-100 max-w-[140px] truncate">
                  {user.name || user.email.split("@")[0]}
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
                  {user.role}
                </div>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs uppercase tracking-[0.18em] text-stone-600 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 py-2 gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
                  active
                    ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium"
                    : "text-stone-700 dark:text-stone-300"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="rounded-full bg-rose-700 text-white px-1.5 text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/**
 * Page header inside a dashboard.
 */
export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
      <div>
        {eyebrow && (
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 mb-2">
            {eyebrow}
          </div>
        )}
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * Stat card for dashboard overviews.
 */
export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "text-stone-900",
  hint,
}: {
  label: string;
  value: string | number;
  delta?: { value: string; positive: boolean };
  icon: LucideIcon;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
          {label}
        </div>
        <Icon className={`h-4 w-4 ${accent}`} strokeWidth={2.2} />
      </div>
      <div className="mt-3 font-headline text-3xl font-bold text-stone-900 dark:text-stone-50">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={
              delta.positive
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-rose-700 dark:text-rose-400 font-medium"
            }
          >
            {delta.positive ? "↑" : "↓"} {delta.value}
          </span>
        )}
        {hint && <span className="text-stone-500">{hint}</span>}
      </div>
    </div>
  );
}

/**
 * Empty state for sections.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 p-10 text-center">
      <Icon className="mx-auto h-10 w-10 text-stone-400" strokeWidth={1.5} />
      <h3 className="mt-4 font-headline text-lg font-semibold text-stone-900 dark:text-stone-50">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
