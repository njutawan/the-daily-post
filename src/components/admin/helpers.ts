/**
 * Shared admin helpers — pure utilities usable from server components
 * (no "use client" needed).
 */

import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { ArticleStatus } from "@/components/admin/types";

/**
 * Format an ISO date string as a readable absolute date (e.g. "Apr 3, 2024").
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

/**
 * Format an ISO date string as a relative time (e.g. "3 days ago").
 */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

/**
 * Format an ISO date string as a short absolute date + time (e.g. "Apr 3, 2024 14:21").
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

/**
 * Format an amount (in cents) as USD currency.
 */
export function formatCurrency(amountCents: number | null | undefined): string {
  const cents = amountCents ?? 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/**
 * Tailwind classes for status badges.
 */
export function statusBadgeClass(status: ArticleStatus | string): string {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "pending_review":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
    case "draft":
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
    case "rejected":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
    case "archived":
      return "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300";
    default:
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
  }
}

/**
 * Friendly label for each article status.
 */
export function statusLabel(status: ArticleStatus | string): string {
  switch (status) {
    case "pending_review":
      return "Pending Review";
    case "published":
      return "Published";
    case "draft":
      return "Draft";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

/**
 * Tailwind classes for role badges.
 */
export function roleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
    case "editor":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
    case "reader":
    default:
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
  }
}

/**
 * Tailwind classes for subscription tier badges.
 */
export function tierBadgeClass(tier: string): string {
  switch (tier) {
    case "allaccess":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "digital":
      return "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900";
    case "free":
    default:
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
  }
}

/**
 * Tailwind classes for payment status badges.
 */
export function paymentStatusBadgeClass(status: string): string {
  switch (status) {
    case "succeeded":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
    case "failed":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
    case "refunded":
      return "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300";
    default:
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
  }
}

/**
 * Tailwind classes for subscription status badges.
 */
export function subStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
    case "past_due":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
    case "canceled":
    case "expired":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
    default:
      return "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300";
  }
}

/**
 * Capitalize the first letter of a word.
 */
export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Count the words in a string (rough — splits on whitespace).
 */
export function wordCount(s: string | null | undefined): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Truncate a string to `max` characters, appending an ellipsis.
 */
export function truncate(s: string | null | undefined, max = 200): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s;
}
