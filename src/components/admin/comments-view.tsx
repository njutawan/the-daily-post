"use client";

/**
 * Comment moderation view.
 *
 * Lists all comments with filters (search + article + status), sorting,
 * and moderation actions (delete comment, dismiss reports).
 *
 * Server actions:
 *   DELETE /api/admin/comments/[commentId] — delete comment + its reports
 *   POST   /api/admin/comments/[commentId]/dismiss — dismiss all reports on
 *          a comment (without deleting the comment itself)
 *
 * Each row shows: article slug, author, body (truncated), date, upvotes,
 * report count badge (red when > 0), and action buttons.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  MessageSquare,
  Search,
  Loader2,
  Trash2,
  ShieldX,
  ExternalLink,
  Flag,
} from "lucide-react";
import { DashboardPageHeader, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import { formatRelative } from "@/components/admin/helpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface AdminCommentRow {
  id: string;
  articleSlug: string;
  author: string;
  body: string;
  upvotes: number;
  createdAt: string;
  parentId: string | null;
  reportCount: number;
}

interface Props {
  user: AdminShellUser;
  comments: AdminCommentRow[];
  articleSlugs: string[];
  pendingReportCount: number;
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "reported", label: "Most reported" },
  { value: "upvoted", label: "Most upvoted" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

const STATUSES = [
  { value: "all", label: "All comments" },
  { value: "reported", label: "Reported only" },
  { value: "clean", label: "No reports" },
] as const;
type StatusValue = (typeof STATUSES)[number]["value"];

export function AdminCommentsView({
  user,
  comments,
  articleSlugs,
  pendingReportCount,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [articleFilter, setArticleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusValue>("all");
  const [sort, setSort] = useState<SortValue>("newest");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = comments;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.author.toLowerCase().includes(q) ||
          c.body.toLowerCase().includes(q) ||
          c.articleSlug.toLowerCase().includes(q)
      );
    }
    if (articleFilter !== "all") {
      list = list.filter((c) => c.articleSlug === articleFilter);
    }
    if (statusFilter === "reported") {
      list = list.filter((c) => c.reportCount > 0);
    } else if (statusFilter === "clean") {
      list = list.filter((c) => c.reportCount === 0);
    }
    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case "oldest":
        sorted.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      case "reported":
        sorted.sort((a, b) => b.reportCount - a.reportCount);
        break;
      case "upvoted":
        sorted.sort((a, b) => b.upvotes - a.upvotes);
        break;
    }
    return sorted;
  }, [comments, query, articleFilter, statusFilter, sort]);

  async function handleDelete(commentId: string) {
    setBusyId(commentId);
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      toast.success("Comment deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismissReports(commentId: string) {
    setBusyId(commentId);
    try {
      const res = await fetch(
        `/api/admin/comments/${commentId}/dismiss-reports`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Dismiss failed");
      }
      toast.success("Reports dismissed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dismiss reports");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell
      user={user}
      navBadge={
        pendingReportCount > 0
          ? [{ href: "/admin/comments", count: pendingReportCount }]
          : []
      }
    >
      <DashboardPageHeader
        eyebrow="Moderation"
        title="Comment moderation"
        description={`${comments.length} comments across ${articleSlugs.length} articles. ${pendingReportCount} reports pending.`}
      />

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search author, body, or article slug…"
            className="pl-9"
          />
        </div>
        <Select value={articleFilter} onValueChange={setArticleFilter}>
          <SelectTrigger className="sm:w-[260px]">
            <SelectValue placeholder="All articles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All articles</SelectItem>
            {articleSlugs.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {slug.length > 32 ? slug.slice(0, 32) + "…" : slug}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusValue)}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortValue)}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comment list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments found"
          description={
            comments.length === 0
              ? "No reader comments yet. They'll appear here once readers start engaging."
              : "No comments match your filters. Try adjusting the search or status."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800">
          {/* Desktop table header */}
          <div className="hidden grid-cols-12 gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500 sm:grid dark:border-stone-800 dark:bg-stone-900">
            <div className="col-span-4">Comment</div>
            <div className="col-span-3">Article</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1 text-center">Votes</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Rows */}
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {filtered.map((c) => (
              <li
                key={c.id}
                className={cn(
                  "grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-12 sm:items-start sm:gap-3",
                  c.reportCount > 0 && "bg-rose-50/40 dark:bg-rose-950/20"
                )}
              >
                {/* Comment */}
                <div className="sm:col-span-4">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-xs font-bold text-stone-900 dark:text-stone-100">
                      {c.author}
                    </span>
                    {c.parentId && (
                      <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-stone-500 dark:bg-stone-800">
                        reply
                      </span>
                    )}
                    {c.reportCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                        <Flag className="h-2.5 w-2.5" />
                        {c.reportCount} report{c.reportCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
                    {c.body}
                  </p>
                </div>

                {/* Article */}
                <div className="sm:col-span-3">
                  <Link
                    href={`/article/${c.articleSlug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 font-sans text-xs text-stone-600 hover:text-rose-700 dark:text-stone-400 dark:hover:text-rose-400"
                  >
                    {c.articleSlug.length > 30
                      ? c.articleSlug.slice(0, 30) + "…"
                      : c.articleSlug}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {/* Date */}
                <div className="sm:col-span-2">
                  <span className="text-xs text-stone-500">
                    {formatRelative(c.createdAt)}
                  </span>
                </div>

                {/* Upvotes */}
                <div className="text-center sm:col-span-1">
                  <span className="font-sans text-sm font-bold text-stone-900 dark:text-stone-100">
                    {c.upvotes}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 sm:col-span-2">
                  {c.reportCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissReports(c.id)}
                      disabled={busyId === c.id}
                      className="h-7 px-2 text-[11px]"
                      title="Dismiss all reports on this comment (keep the comment)"
                    >
                      {busyId === c.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ShieldX className="h-3 w-3" />
                      )}
                      Dismiss
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === c.id}
                        className="h-7 border-rose-300 px-2 text-[11px] text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes the comment and dismisses
                          all its associated reports. The comment&apos;s author
                          will not be notified.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={busyId === c.id}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(c.id)}
                          disabled={busyId === c.id}
                          className="bg-rose-700 hover:bg-rose-800 text-white"
                        >
                          {busyId === c.id && (
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                          )}
                          Delete comment
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  );
}
