"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bookmark as BookmarkIcon,
  ChevronDown,
  Loader2,
  LogOut,
  PenLine,
  ShieldCheck,
  BookOpen,
  LayoutDashboard,
  User as UserIcon,
} from "lucide-react";
import { useUnifiedAuth, type Role } from "@/components/unified-auth-provider";

const ROLE_LABEL: Record<Role, string> = {
  reader: "Member",
  editor: "Editor",
  admin: "Admin",
};

const ROLE_ACCENT: Record<Role, string> = {
  reader: "text-emerald-700 dark:text-emerald-400",
  editor: "text-amber-700 dark:text-amber-400",
  admin: "text-rose-700 dark:text-rose-400",
};

const WORKSPACES: { role: Role; href: string; label: string; icon: typeof PenLine }[] = [
  { role: "reader", href: "/member", label: "Member area", icon: BookOpen },
  { role: "editor", href: "/editorial", label: "Editor workspace", icon: PenLine },
  { role: "admin", href: "/admin", label: "Admin dashboard", icon: ShieldCheck },
];

/**
 * Workspace menu — the unified replacement for UserMenu.
 *
 * Uses the unified auth context (which mirrors Clerk's API). Clerk is
 * the sole auth provider — there is no local/demo fallback.
 *
 * Signed out: shows a "Sign in" link to /member.
 * Signed in: shows avatar + role badge + dropdown with workspace links
 *            and sign-out.
 */
export function WorkspaceMenu() {
  const { user, loading, isSignedIn, signOut } = useUnifiedAuth();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!mounted || loading) {
    return (
      <span className="flex h-8 w-8 items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
      </span>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <Link
        href="/member"
        className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white"
      >
        <UserIcon className="h-3.5 w-3.5" />
        Sign in
      </Link>
    );
  }

  const name = user.name || user.email.split("@")[0];
  const initials = name
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  // The user's own workspace (matches their role).
  const ownWorkspace = WORKSPACES.find((w) => w.role === user.role) ?? WORKSPACES[0];

  return (
    <div className="group relative flex items-center gap-2" ref={ref}>
      <Link
        href="/saved"
        className="hidden items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white sm:flex"
      >
        <BookmarkIcon className="h-3.5 w-3.5" />
        Saved
      </Link>
      <span className="hidden text-stone-300 dark:text-stone-700 sm:inline">|</span>

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold uppercase text-white dark:bg-stone-700">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden flex-col font-sans text-[10px] leading-tight sm:flex">
          <span className="text-[9px] uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Good {greeting} · <span className={ROLE_ACCENT[user.role]}>{ROLE_LABEL[user.role]}</span>
          </span>
          <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
            {name.split(" ")[0]}
          </span>
        </span>
        <ChevronDown className={`h-3 w-3 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="border-b border-stone-200 p-3 dark:border-stone-800">
            <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Signed in as
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold text-stone-900 dark:text-stone-50">
              {user.email}
            </div>
            <div className={`mt-1 text-[10px] uppercase tracking-[0.18em] font-medium ${ROLE_ACCENT[user.role]}`}>
              {ROLE_LABEL[user.role]}
              {user.subTier !== "free" && (
                <span className="ml-2 text-stone-500">
                  · {user.subTier === "digital" ? "Digital" : "All Access"}
                </span>
              )}
            </div>
          </div>

          <div className="p-2">
            <Link
              href={ownWorkspace.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <LayoutDashboard className="h-4 w-4 text-stone-500" />
              <span>Your workspace</span>
            </Link>
            <Link
              href="/saved"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <BookmarkIcon className="h-4 w-4 text-stone-500" />
              <span>Saved articles</span>
            </Link>
          </div>

          <div className="border-t border-stone-200 p-2 dark:border-stone-800">
            <div className="px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Switch workspace
            </div>
            {WORKSPACES.map((w) => {
              const Icon = w.icon;
              const active = user.role === w.role;
              return (
                <Link
                  key={w.role}
                  href={w.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-50 font-medium"
                      : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${ROLE_ACCENT[w.role]}`} />
                  <span className="flex-1">{w.label}</span>
                  {active && <span className="text-[10px] uppercase tracking-wider text-stone-500">current</span>}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-stone-200 p-2 dark:border-stone-800">
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              <LogOut className="h-4 w-4 text-stone-500" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceMenu;
