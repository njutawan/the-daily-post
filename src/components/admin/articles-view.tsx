"use client";

/**
 * All Articles admin view.
 *
 * Lists every article (admin can see all statuses). Filters by status,
 * category, and free-text author/title search. Provides feature toggle
 * and archive actions for published articles.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Newspaper,
  ExternalLink,
  Star,
  Archive,
  Loader2,
  Search,
  Eye,
  MessageSquare,
} from "lucide-react";
import { DashboardPageHeader, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import {
  formatDate,
  formatRelative,
  statusBadgeClass,
  statusLabel,
  titleCase,
} from "@/components/admin/helpers";
import { ARTICLE_CATEGORIES, type AdminArticleRow } from "@/components/admin/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["all", "draft", "pending_review", "published", "rejected", "archived"] as const;

export interface AdminArticlesViewProps {
  user: AdminShellUser;
  pendingCount: number;
  articles: AdminArticleRow[];
}

export function AdminArticlesView({ user, pendingCount, articles }: AdminArticlesViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [authorQuery, setAuthorQuery] = useState<string>("");

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (authorQuery.trim()) {
        const q = authorQuery.toLowerCase();
        const haystack = `${a.author.name ?? ""} ${a.author.byline ?? ""} ${a.title}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [articles, statusFilter, categoryFilter, authorQuery]);

  return (
    <AdminShell
      user={user}
      navBadge={[{ href: "/admin/reviews", count: pendingCount }]}
    >
      <DashboardPageHeader
        eyebrow="Content"
        title="All Articles"
        description="Every article in the system, across all statuses. Filter, search, and take action on published articles."
      />

      {/* Filter bar */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              type="search"
              placeholder="Search by title or author…"
              value={authorQuery}
              onChange={(e) => setAuthorQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ARTICLE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {titleCase(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          Showing <span className="font-semibold text-stone-700 dark:text-stone-300">{filtered.length}</span> of {articles.length} articles
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={articles.length === 0 ? "No articles yet" : "No matches"}
          description={
            articles.length === 0
              ? "Articles created by editors will appear here. Try the /editor workspace to create one."
              : "Try adjusting your filters or search query."
          }
        />
      ) : (
        <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Title</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Author</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Status</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Category</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Views</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Comments</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Updated</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-stone-200 dark:divide-stone-800">
            {filtered.map((a) => (
              <ArticleMobileCard key={a.id} article={a} />
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  );
}

function ArticleRow({ article }: { article: AdminArticleRow }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function toggleFeatured() {
    setToggling(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !article.featured }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update article");
      }
      toast.success(
        article.featured
          ? "Removed from featured."
          : "Featured on the homepage."
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update article");
    } finally {
      setToggling(false);
    }
  }

  async function archive() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to archive article");
      }
      toast.success("Article archived.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to archive article");
    } finally {
      setArchiving(false);
    }
  }

  const canFeatureOrArchive = article.status === "published";

  return (
    <tr className="border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
      <td className="px-4 py-3">
        <Link
          href={`/article/${article.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block font-headline text-sm font-semibold text-stone-900 dark:text-stone-50 hover:text-rose-700 dark:hover:text-rose-400"
        >
          {article.featured && (
            <Star className="inline h-3.5 w-3.5 text-amber-500 mr-1 -mt-0.5" fill="currentColor" />
          )}
          {article.title}
        </Link>
        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
          Published {article.publishedAt ? formatDate(article.publishedAt) : "—"}
        </div>
      </td>
      <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
        {article.author.byline ?? article.author.name ?? "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(
            article.status
          )}`}
        >
          {statusLabel(article.status)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400">
        {titleCase(article.category)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
        {article.viewCount.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
        {article.commentCount.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">
        {formatRelative(article.updatedAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {canFeatureOrArchive && (
            <>
              <button
                type="button"
                onClick={toggleFeatured}
                disabled={toggling}
                title={article.featured ? "Unfeature" : "Feature"}
                className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors disabled:opacity-50 ${
                  article.featured
                    ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    : "text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" fill={article.featured ? "currentColor" : "none"} />}
              </button>
              <button
                type="button"
                onClick={archive}
                disabled={archiving}
                title="Archive"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-rose-700 dark:hover:text-rose-400 transition-colors disabled:opacity-50"
              >
                {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
          <Link
            href={`/article/${article.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open article"
            className="inline-flex items-center justify-center rounded-md p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function ArticleMobileCard({ article }: { article: AdminArticleRow }) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);
  const [archiving, setArchiving] = useState(false);

  async function toggleFeatured() {
    setToggling(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: !article.featured }),
      });
      if (!res.ok) throw new Error("Failed to update article");
      toast.success(article.featured ? "Removed from featured." : "Featured on the homepage.");
      router.refresh();
    } catch {
      toast.error("Failed to update article");
    } finally {
      setToggling(false);
    }
  }

  async function archive() {
    setArchiving(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error("Failed to archive article");
      toast.success("Article archived.");
      router.refresh();
    } catch {
      toast.error("Failed to archive article");
    } finally {
      setArchiving(false);
    }
  }

  const canFeatureOrArchive = article.status === "published";

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/article/${article.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-headline text-sm font-semibold text-stone-900 dark:text-stone-50 hover:text-rose-700 dark:hover:text-rose-400 flex-1"
        >
          {article.featured && (
            <Star className="inline h-3.5 w-3.5 text-amber-500 mr-1 -mt-0.5" fill="currentColor" />
          )}
          {article.title}
        </Link>
        <span
          className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(
            article.status
          )}`}
        >
          {statusLabel(article.status)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center flex-wrap gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className="font-medium text-stone-700 dark:text-stone-300">
          {article.author.byline ?? article.author.name ?? "—"}
        </span>
        <span>·</span>
        <span className="uppercase tracking-wider">{titleCase(article.category)}</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {article.viewCount.toLocaleString()}
        </span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {article.commentCount.toLocaleString()}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        {canFeatureOrArchive && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleFeatured}
              disabled={toggling}
              className="h-7 px-2 text-xs"
            >
              {toggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" fill={article.featured ? "currentColor" : "none"} />}
              <span className="ml-1">{article.featured ? "Unfeature" : "Feature"}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={archive}
              disabled={archiving}
              className="h-7 px-2 text-xs"
            >
              {archiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              <span className="ml-1">Archive</span>
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
