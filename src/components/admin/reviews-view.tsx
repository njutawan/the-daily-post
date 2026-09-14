"use client";

/**
 * Admin review queue view.
 *
 * Lists pending_review articles grouped by category tabs. Each card has
 * three actions (Approve / Request Changes / Reject) that open a shadcn
 * Dialog. Confirming calls POST /api/admin/review/[articleId] and then
 * router.refresh() to update the queue.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { DashboardPageHeader, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import {
  formatRelative,
  statusBadgeClass,
  statusLabel,
  truncate,
  wordCount,
  titleCase,
} from "@/components/admin/helpers";
import { ARTICLE_CATEGORIES, type AdminArticleRow } from "@/components/admin/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type ReviewAction = "approved" | "rejected" | "requested_changes";

export interface AdminReviewsViewProps {
  user: AdminShellUser;
  pendingCount: number;
  articles: AdminArticleRow[];
}

export function AdminReviewsView({ user, pendingCount, articles }: AdminReviewsViewProps) {
  return (
    <AdminShell
      user={user}
      navBadge={[{ href: "/admin/reviews", count: pendingCount }]}
    >
      <DashboardPageHeader
        eyebrow="Editorial Workflow"
        title="Review Queue"
        description="Approve, request changes, or reject articles submitted by editors. Each decision is recorded in the audit trail."
      />

      {articles.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No articles awaiting review"
          description="The review queue is empty. When editors submit an article, it will appear here for admin approval."
          action={
            <Link
              href="/admin/articles"
              className="inline-flex items-center gap-2 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-sm font-medium"
            >
              Browse all articles
            </Link>
          }
        />
      ) : (
        <ReviewsTabs articles={articles} />
      )}
    </AdminShell>
  );
}

function ReviewsTabs({ articles }: { articles: AdminArticleRow[] }) {
  const byCategory = useMemo(() => {
    const map: Record<string, AdminArticleRow[]> = {};
    for (const a of articles) {
      const key = a.category || "uncategorized";
      (map[key] ??= []).push(a);
    }
    return map;
  }, [articles]);

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="overflow-x-auto h-auto flex-wrap">
        <TabsTrigger value="all">
          All ({articles.length})
        </TabsTrigger>
        {ARTICLE_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0).map((c) => (
          <TabsTrigger key={c} value={c} className="capitalize">
            {titleCase(c)} ({byCategory[c]!.length})
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="all" className="mt-6">
        <ArticleList articles={articles} />
      </TabsContent>
      {ARTICLE_CATEGORIES.filter((c) => (byCategory[c]?.length ?? 0) > 0).map((c) => (
        <TabsContent key={c} value={c} className="mt-6">
          <ArticleList articles={byCategory[c]!} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ArticleList({ articles }: { articles: AdminArticleRow[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {articles.map((a) => (
        <ReviewCard key={a.id} article={a} />
      ))}
    </div>
  );
}

function ReviewCard({ article }: { article: AdminArticleRow }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<ReviewAction>("approved");
  const [notes, setNotes] = useState("");
  const [featured, setFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requiresNotes = action === "rejected" || action === "requested_changes";

  function openDialog(a: ReviewAction) {
    setAction(a);
    setNotes("");
    setFeatured(false);
    setDialogOpen(true);
  }

  async function handleConfirm() {
    if (requiresNotes && !notes.trim()) {
      toast.error("Notes are required for this action.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/review/${article.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: notes.trim(),
          featured: action === "approved" ? featured : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }
      const verb =
        action === "approved"
          ? "approved and published"
          : action === "rejected"
            ? "rejected"
            : "sent back for changes";
      toast.success(`"${article.title.slice(0, 60)}${article.title.length > 60 ? "…" : ""}" was ${verb}.`);
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  const words = wordCount(article.body);
  const preview = truncate(article.excerpt || article.body.replace(/[#*>`_-]/g, ""), 200);

  return (
    <article className="flex flex-col rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-400">
            {titleCase(article.category)}
          </span>
          <h3 className="mt-1 font-headline text-xl font-bold text-stone-900 dark:text-stone-50 leading-tight">
            {article.title}
          </h3>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(
            article.status
          )}`}
        >
          {statusLabel(article.status)}
        </span>
      </header>

      <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className="font-medium text-stone-700 dark:text-stone-300">
          {article.author.byline ?? article.author.name ?? "Unknown"}
        </span>
        <span>·</span>
        <span>{words.toLocaleString()} words</span>
        <span>·</span>
        <span>Submitted {formatRelative(article.updatedAt)}</span>
      </div>

      <p className="mt-3 font-body text-sm text-stone-700 dark:text-stone-300 leading-relaxed flex-1">
        {preview}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-200 dark:border-stone-800 pt-4">
        <Link
          href={`/article/${article.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open article
        </Link>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => openDialog("approved")}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Approve
        </button>
        <button
          type="button"
          onClick={() => openDialog("requested_changes")}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-amber-600 transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Request Changes
        </button>
        <button
          type="button"
          onClick={() => openDialog("rejected")}
          className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-rose-700 transition-colors"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>

      {/* Review dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !submitting && setDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approved" && "Approve & publish article"}
              {action === "rejected" && "Reject article"}
              {action === "requested_changes" && "Request changes"}
            </DialogTitle>
            <DialogDescription className="text-stone-500 dark:text-stone-400">
              <span className="block font-headline text-base font-semibold text-stone-900 dark:text-stone-50 mt-1">
                {article.title}
              </span>
              <span className="block mt-1">
                By {article.author.byline ?? article.author.name ?? "Unknown"} · {titleCase(article.category)}
              </span>
            </DialogDescription>
          </DialogHeader>

          {action === "approved" ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="approve-notes" className="text-sm font-medium">
                  Notes (optional)
                </Label>
                <Textarea
                  id="approve-notes"
                  placeholder="Optional note for the editor — e.g. ‘Great scoop, congrats!'"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="mt-1.5"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="approve-feature"
                  checked={featured}
                  onCheckedChange={(v) => setFeatured(Boolean(v))}
                />
                <Label htmlFor="approve-feature" className="text-sm">
                  Feature this article on the homepage
                </Label>
              </div>
            </div>
          ) : action === "rejected" ? (
            <div>
              <Label htmlFor="reject-reason" className="text-sm font-medium">
                Reason <span className="text-rose-700">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                required
                placeholder="Explain why this article is being rejected. The editor will see this feedback."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-1.5"
              />
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                The article will be moved to <strong>Rejected</strong> status. The editor
                can still see your feedback in their dashboard.
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="changes-feedback" className="text-sm font-medium">
                Feedback for the editor <span className="text-rose-700">*</span>
              </Label>
              <Textarea
                id="changes-feedback"
                required
                placeholder="Tell the editor what needs to change before this can be published."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="mt-1.5"
              />
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                The article will be moved back to <strong>Draft</strong> status with your
                notes attached.
              </p>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting || (requiresNotes && !notes.trim())}
              className={
                action === "approved"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : action === "rejected"
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
              }
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {action === "approved" && "Approve & publish"}
              {action === "rejected" && "Reject article"}
              {action === "requested_changes" && "Send back to editor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
