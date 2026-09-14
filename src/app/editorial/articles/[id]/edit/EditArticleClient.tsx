"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
import { EditorShell } from "../../../EditorShell";
import { DashboardPageHeader } from "@/components/dashboard/shell";
import { StatusBadge, type ArticleStatus } from "../../../StatusBadge";
import { ArticleEditorForm } from "../../ArticleEditorForm";
import {
  CATEGORY_LABELS,
  type EditorArticleDetail,
  type EditorStats,
  type EditorUser,
} from "../../../types";
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

interface EditArticleClientProps {
  user: EditorUser;
  article: EditorArticleDetail;
  stats: EditorStats;
}

const ACTION_LABELS: Record<string, { label: string; tone: string }> = {
  approved: {
    label: "Approved",
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  },
  requested_changes: {
    label: "Requested changes",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
};

export function EditArticleClient({
  user,
  article,
  stats,
}: EditArticleClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPublished = article.status === "published";
  const isArchived = article.status === "archived";
  const isPending = article.status === "pending_review";
  const readOnly = isPublished || isArchived;
  const hideSubmit = isPending || isPublished || isArchived;
  const canDelete = article.status === "draft" || article.status === "rejected";

  async function handleQuickSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/submit`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit");
        return;
      }
      toast.success("Submitted for admin review");
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
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
      router.push("/editorial/articles");
      router.refresh();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setDeleting(false);
    }
  }

  const badges = { drafts: stats.drafts, pending: stats.pending };

  return (
    <EditorShell user={user} badges={badges}>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href="/editorial/articles"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-stone-500 hover:text-amber-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Articles
        </Link>
        <div className="flex items-center gap-2">
          <StatusBadge status={article.status} />
          {isPublished && (
            <Link
              href={`/article/${article.slug}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40"
            >
              View on site
            </Link>
          )}
        </div>
      </div>

      <DashboardPageHeader
        eyebrow={`${CATEGORY_LABELS[article.category as keyof typeof CATEGORY_LABELS] ?? article.category} · ${format(new Date(article.updatedAt), "MMM d, yyyy")}`}
        title={article.title || "Untitled draft"}
        description={
          isPublished
            ? "This article is live on the site. Editing is locked for editors — contact an admin to make changes."
            : isArchived
              ? "This article is archived. Contact an admin to restore it."
              : isPending
                ? "This article is in the admin review queue. Saving changes will move it back to draft."
                : "Edit your article. Save a draft anytime, or submit for review when ready."
        }
      />

      <StatusBanner article={article} />

      {/* Toolbar with quick submit / delete for non-form scenarios */}
      {(canDelete || (article.status === "draft" && !hideSubmit)) && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-stone-300 text-rose-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800 dark:border-stone-700 dark:hover:bg-rose-950/50"
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete article
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this article?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes <strong className="text-stone-900 dark:text-stone-50">{article.title}</strong>.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-rose-700 text-white hover:bg-rose-800"
                  >
                    Yes, delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {article.status === "draft" && !hideSubmit && (
            <Button
              onClick={handleQuickSubmit}
              disabled={submitting}
              className="bg-amber-700 text-white hover:bg-amber-800"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit for review
            </Button>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 md:p-8">
        <ArticleEditorForm
          mode="edit"
          articleId={article.id}
          initial={{
            title: article.title,
            excerpt: article.excerpt,
            body: article.body,
            category: article.category,
            tags: article.tags,
            heroImage: article.heroImage,
            heroCaption: article.heroCaption,
          }}
          readOnly={readOnly}
          hideSubmit={hideSubmit}
        />
      </div>

      {/* Review history */}
      <ReviewHistoryPanel article={article} />
    </EditorShell>
  );
}

function StatusBanner({ article }: { article: EditorArticleDetail }) {
  const status = article.status as ArticleStatus;

  if (status === "draft") {
    return (
      <div className="mt-6 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3">
        <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <strong className="font-headline font-semibold">Draft</strong> —
          Submit for review when ready. Use <em>Save &amp; submit for review</em> below,
          or the toolbar button above.
        </div>
      </div>
    );
  }

  if (status === "pending_review") {
    return (
      <div className="mt-6 rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 px-4 py-3 flex items-start gap-3">
        <Clock className="h-4 w-4 mt-0.5 shrink-0 text-sky-700" />
        <div className="text-sm text-sky-900 dark:text-sky-200">
          <strong className="font-headline font-semibold">Awaiting admin review</strong>
          {article.updatedAt && (
            <> — Submitted {format(new Date(article.updatedAt), "MMM d, yyyy")}.</>
          )}{" "}
          Any edits will move this back to <em>draft</em>.
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="mt-6 rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-700" />
        <div className="text-sm text-rose-900 dark:text-rose-200">
          <strong className="font-headline font-semibold">Rejected</strong>
          {article.reviewerName && <> by {article.reviewerName}</>}
          {article.updatedAt && <> on {format(new Date(article.updatedAt), "MMM d, yyyy")}</>}.
          {article.reviewNotes && (
            <div className="mt-1 italic">Notes: “{article.reviewNotes}”</div>
          )}
          <div className="mt-1">Make the requested changes and re-submit for review.</div>
        </div>
      </div>
    );
  }

  if (status === "published") {
    return (
      <div className="mt-6 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3">
        <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-700" />
        <div className="text-sm text-emerald-900 dark:text-emerald-200">
          <strong className="font-headline font-semibold">Published</strong>
          {article.publishedAt && (
            <> on {format(new Date(article.publishedAt), "MMM d, yyyy")}.</>
          )}{" "}
          To make changes, contact an admin — editors cannot edit published
          articles directly. Your changes will be queued as a new draft.
        </div>
      </div>
    );
  }

  if (status === "archived") {
    return (
      <div className="mt-6 rounded-md border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-4 py-3 flex items-start gap-3">
        <Archive className="h-4 w-4 mt-0.5 shrink-0 text-stone-600" />
        <div className="text-sm text-stone-700 dark:text-stone-300">
          <strong className="font-headline font-semibold">Archived</strong> —
          This article is no longer live. Contact an admin to restore it.
        </div>
      </div>
    );
  }

  return null;
}

function ReviewHistoryPanel({ article }: { article: EditorArticleDetail }) {
  if (article.reviews.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <header className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-stone-500" />
          <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
            Review history
          </h2>
        </div>
        <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-stone-500">
          Every action taken on this article by the editorial desk
        </p>
      </header>
      <ol className="divide-y divide-stone-200 dark:divide-stone-800">
        {article.reviews.map((r) => {
          const tone = ACTION_LABELS[r.action]?.tone ?? "bg-stone-100 text-stone-700";
          return (
            <li key={r.id} className="px-5 py-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${tone}`}
                >
                  {ACTION_LABELS[r.action]?.label ?? r.action}
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  {r.reviewerName ? `By ${r.reviewerName}` : "By reviewer"} ·{" "}
                  {format(new Date(r.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {r.notes && (
                <p className="mt-1.5 text-sm text-stone-700 dark:text-stone-300 italic">
                  “{r.notes}”
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
