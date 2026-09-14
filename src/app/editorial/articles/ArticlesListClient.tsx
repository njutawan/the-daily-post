"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowRight,
  Eye,
  Loader2,
  MessageSquare,
  PenLine,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { EditorShell } from "../EditorShell";
import { DashboardPageHeader, EmptyState } from "@/components/dashboard/shell";
import { StatusBadge, type ArticleStatus } from "../StatusBadge";
import {
  ARTICLE_CATEGORIES,
  CATEGORY_LABELS,
  type EditorArticleSummary,
  type EditorStats,
  type EditorUser,
} from "../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

type SortKey = "updated" | "status" | "category" | "title";

const STATUS_OPTIONS: { value: "all" | ArticleStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending Review" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "updated", label: "Last updated" },
  { value: "status", label: "Status" },
  { value: "category", label: "Category" },
  { value: "title", label: "Title (A→Z)" },
];

interface ArticlesListClientProps {
  user: EditorUser;
  articles: EditorArticleSummary[];
  stats: EditorStats;
}

export function ArticlesListClient({
  user,
  articles: initial,
  stats,
}: ArticlesListClientProps) {
  const router = useRouter();
  const [articles, setArticles] = useState<EditorArticleSummary[]>(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ArticleStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = articles.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.excerpt ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((a) => a.category === categoryFilter);
    }
    list.sort((a, b) => {
      switch (sort) {
        case "status":
          return a.status.localeCompare(b.status) || b.updatedAt.localeCompare(a.updatedAt);
        case "category":
          return a.category.localeCompare(b.category) || b.updatedAt.localeCompare(a.updatedAt);
        case "title":
          return a.title.localeCompare(b.title);
        case "updated":
        default:
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });
    return list;
  }, [articles, search, statusFilter, categoryFilter, sort]);

  async function handleSubmit(article: EditorArticleSummary) {
    setSubmittingId(article.id);
    try {
      const res = await fetch(`/api/articles/${article.id}/submit`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit article");
        return;
      }
      toast.success("Submitted for admin review");
      setArticles((prev) =>
        prev.map((a) =>
          a.id === article.id
            ? { ...a, status: "pending_review", updatedAt: new Date().toISOString() }
            : a,
        ),
      );
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleDelete(article: EditorArticleSummary) {
    setDeletingId(article.id);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete article");
        return;
      }
      toast.success("Article deleted");
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setDeletingId(null);
    }
  }

  const badges = {
    drafts: stats.drafts,
    pending: stats.pending,
  };

  return (
    <EditorShell user={user} badges={badges}>
      <DashboardPageHeader
        eyebrow="Editor workspace"
        title="My Articles"
        description="Everything you've written — drafts, submissions in review, published work, and feedback. Use the filters to narrow down."
        actions={
          <Link
            href="/editorial/articles/new"
            className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-amber-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New article
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              type="search"
              placeholder="Search by title or excerpt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "all" | ArticleStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ARTICLE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing <span className="font-medium text-stone-900 dark:text-stone-100">{filtered.length}</span> of{" "}
            <span className="font-medium text-stone-900 dark:text-stone-100">{articles.length}</span> articles
          </span>
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-[0.18em] text-stone-400">Sort</span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger size="sm" className="h-7 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={PenLine}
            title={articles.length === 0 ? "No articles yet" : "No articles match your filters"}
            description={
              articles.length === 0
                ? "Start a new draft and submit it for review."
                : "Try clearing the search box or changing the status / category filters."
            }
            action={
              articles.length === 0 ? (
                <Link
                  href="/editorial/articles/new"
                  className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-amber-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New article
                </Link>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((article) => (
              <ArticleRow
                key={article.id}
                article={article}
                onSubmit={() => handleSubmit(article)}
                onDelete={() => handleDelete(article)}
                submitting={submittingId === article.id}
                deleting={deletingId === article.id}
              />
            ))}
          </ul>
        )}
      </div>
    </EditorShell>
  );
}

interface ArticleRowProps {
  article: EditorArticleSummary;
  onSubmit: () => void;
  onDelete: () => void;
  submitting: boolean;
  deleting: boolean;
}

function ArticleRow({
  article,
  onSubmit,
  onDelete,
  submitting,
  deleting,
}: ArticleRowProps) {
  const canSubmit = article.status === "draft" || article.status === "rejected";
  const canDelete = article.status === "draft" || article.status === "rejected" || article.status === "archived";

  return (
    <li className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <StatusBadge status={article.status} />
            <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
              {CATEGORY_LABELS[article.category as keyof typeof CATEGORY_LABELS] ?? article.category}
            </span>
          </div>
          <Link
            href={`/editorial/articles/${article.id}/edit`}
            className="block font-headline text-lg font-semibold text-stone-900 dark:text-stone-50 hover:text-amber-700 dark:hover:text-amber-400 transition-colors line-clamp-2"
          >
            {article.title}
          </Link>
          {article.reviewNotes && (article.status === "rejected" || article.status === "pending_review") && (
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 italic line-clamp-2">
              <span className="font-medium not-italic">Admin notes:</span> “{article.reviewNotes}”
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
            <span>Updated {format(new Date(article.updatedAt), "MMM d, yyyy")}</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {article.viewCount.toLocaleString()} views
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {article.commentCount.toLocaleString()} comments
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-stone-300 hover:border-amber-500 hover:text-amber-700"
          >
            <Link href={`/editorial/articles/${article.id}/edit`}>
              <PenLine className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>

          {canSubmit && (
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={submitting}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Submit
            </Button>
          )}

          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-stone-300 text-rose-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800 dark:border-stone-700 dark:hover:bg-rose-950/50"
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes <strong className="text-stone-900 dark:text-stone-50">{article.title}</strong>.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-rose-700 text-white hover:bg-rose-800"
                  >
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {!canSubmit && !canDelete && article.status === "published" && (
            <Link
              href={`/article/${article.slug}`}
              className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              View on site <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
