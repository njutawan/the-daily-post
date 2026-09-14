import { cn } from "@/lib/utils";

export type ArticleStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived";

const STATUS_META: Record<
  ArticleStatus,
  { label: string; pill: string; dot: string }
> = {
  draft: {
    label: "Draft",
    pill: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  pending_review: {
    label: "Pending Review",
    pill:
      "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-800",
    dot: "bg-sky-500",
  },
  published: {
    label: "Published",
    pill:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
  archived: {
    label: "Archived",
    pill:
      "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
    dot: "bg-stone-400",
  },
};

/**
 * Small rounded pill with a color-coded background for an article status.
 * Compact and consistent across the dashboard / list / detail pages.
 *
 * Note: `sky` is used for "pending review" rather than pure blue because
 * the project palette avoids indigo/blue as primary colors — but a touch
 * of cool blue is acceptable here to differentiate from the warm amber/
 * emerald/rose used for the other statuses.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: ArticleStatus;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        meta.pill,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export function statusLabel(status: ArticleStatus): string {
  return (STATUS_META[status] ?? STATUS_META.draft).label;
}
