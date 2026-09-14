"use client";

import * as React from "react";
import { MessageSquare, Send, Loader2, Reply, CornerDownRight, ArrowBigUp, Flag, X, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  articleSlug: string;
  author: string;
  body: string;
  parentId: string | null;
  upvotes: number;
  createdAt: string;
};

type CommentsProps = {
  slug: string;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Wrapper that only renders timeAgo on the client (after mount).
 * On SSR, shows a stable placeholder to avoid hydration mismatch
 * (server Date.now() vs client Date.now() differ).
 */
function TimeAgo({ iso, mounted }: { iso: string; mounted: boolean }) {
  if (!mounted) return <span>&nbsp;</span>;
  return <>{timeAgo(iso)}</>;
}

export function Comments({ slug }: CommentsProps) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [author, setAuthor] = React.useState("");
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<"newest" | "top">("newest");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const PAGE_SIZE = 5;
  const { toast } = useToast();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch the first page from the server
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/comments/${slug}?limit=${PAGE_SIZE}&offset=0`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) {
          setComments(data.comments);
          setTotal(data.total ?? data.comments.length);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Load more from the server (appends the next page)
  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/comments/${slug}?limit=${PAGE_SIZE}&offset=${comments.length}`
      );
      const data = await res.json();
      if (data.ok) {
        setComments((prev) => [...prev, ...data.comments]);
        if (typeof data.total === "number") setTotal(data.total);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: author.trim(),
          body: body.trim(),
          parentId: replyTo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to post comment");
      }
      setComments((prev) => [data.comment, ...prev]);
      setBody("");
      setReplyTo(null);
      toast({ title: "Comment posted", description: "Thanks for joining the conversation." });
    } catch (err) {
      toast({
        title: "Couldn't post comment",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Filter by search query (author + body), then sort top-level comments
  const q = searchQuery.trim().toLowerCase();
  const filteredComments = q
    ? comments.filter(
        (c) =>
          c.author.toLowerCase().includes(q) || c.body.toLowerCase().includes(q)
      )
    : comments;

  // Sort top-level comments: newest (desc by createdAt) or top (desc by upvotes)
  const topLevel = filteredComments
    .filter((c) => !c.parentId)
    .sort((a, b) => {
      if (sortBy === "top") {
        if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
        // Tie-break by recency
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const repliesOf = (id: string) =>
    filteredComments.filter((c) => c.parentId === id);
  const totalReplies = comments.filter((c) => c.parentId).length;

  return (
    <section className="mt-12 border-t-2 border-black pt-8 dark:border-white">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <MessageSquare className="h-5 w-5 text-red-700" />
        <h2 className="font-headline text-2xl font-black text-black dark:text-white">
          The Conversation
        </h2>
        <span className="ml-auto flex items-center gap-3 font-sans text-xs text-stone-500 dark:text-stone-400">
          <span>
            {total > 0 ? total : comments.length}{" "}
            {(total > 0 ? total : comments.length) === 1 ? "comment" : "comments"}
            {totalReplies > 0 && ` · ${totalReplies} replies`}
          </span>
          {total > 0 && (
            <span className="flex items-center gap-1">
              <button
                onClick={() => setSortBy("newest")}
                className={cn(
                  "rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition",
                  sortBy === "newest"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-stone-500 hover:text-black dark:text-stone-400 dark:hover:text-white"
                )}
              >
                Newest
              </button>
              <button
                onClick={() => setSortBy("top")}
                className={cn(
                  "rounded-sm px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition",
                  sortBy === "top"
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-stone-500 hover:text-black dark:text-stone-400 dark:hover:text-white"
                )}
              >
                Top
              </button>
            </span>
          )}
        </span>
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-3 border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900">
        {replyTo && (
          <div className="flex items-center justify-between rounded-sm bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-950 dark:text-stone-400">
            <span className="flex items-center gap-1.5">
              <CornerDownRight className="h-3 w-3" />
              Replying to a comment
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-red-700 hover:underline"
            >
              Cancel reply
            </button>
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
            maxLength={60}
            className="h-10 w-40 shrink-0 rounded-none border border-stone-400 bg-white px-3 font-sans text-sm outline-none focus:border-black dark:border-stone-700 dark:bg-stone-950 dark:text-white"
            aria-label="Your name"
            disabled={submitting}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Join the conversation. Be respectful — this is a moderated space."
            maxLength={1000}
            rows={3}
            className="min-h-[60px] flex-1 resize-none rounded-none border border-stone-400 bg-white px-3 py-2 font-body text-sm leading-relaxed outline-none focus:border-black dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:placeholder:text-stone-500"
            aria-label="Your comment"
            disabled={submitting}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
            {body.length}/1000 characters
          </span>
          <Button
            type="submit"
            disabled={submitting || !author.trim() || !body.trim()}
            className="h-9 rounded-none bg-black px-4 text-xs font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-stone-200"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Post comment
          </Button>
        </div>
      </form>

      {/* Search/filter */}
      {comments.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments…"
              className="h-8 w-full rounded-sm border border-stone-300 bg-white pl-8 pr-3 font-sans text-xs outline-none focus:border-black dark:border-stone-700 dark:bg-stone-950 dark:text-white dark:placeholder:text-stone-500"
              aria-label="Search comments"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-stone-200 dark:bg-stone-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                <div className="h-3 w-full animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="border border-dashed border-stone-300 py-10 text-center dark:border-stone-700">
          <MessageSquare className="mx-auto h-8 w-8 text-stone-400" />
          <p className="mt-2 font-headline text-lg text-stone-600 dark:text-stone-400">
            No comments yet.
          </p>
          <p className="mt-1 font-sans text-sm text-stone-500 dark:text-stone-500">
            Be the first to start the conversation.
          </p>
        </div>
      ) : topLevel.length === 0 ? (
        <div className="border border-dashed border-stone-300 py-10 text-center dark:border-stone-700">
          <Search className="mx-auto h-8 w-8 text-stone-400" />
          <p className="mt-2 font-headline text-lg text-stone-600 dark:text-stone-400">
            No comments match &ldquo;{searchQuery}&rdquo;.
          </p>
          <button
            onClick={() => setSearchQuery("")}
            className="mt-2 font-sans text-sm font-bold uppercase tracking-wider text-red-700 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {topLevel.map((comment) => (
            <CommentThread
              key={comment.id}
              slug={slug}
              comment={comment}
              replies={repliesOf(comment.id)}
              onReply={setReplyTo}
              mounted={mounted}
              onUpvote={(id, newCount) =>
                setComments((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, upvotes: newCount } : c))
                )
              }
              onEdit={(id, newBody) =>
                setComments((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, body: newBody } : c))
                )
              }
            />
          ))}
          {comments.length < total && !searchQuery && (
            <div className="border-t border-stone-200 pt-4 text-center dark:border-stone-800">
              <p className="mb-3 font-sans text-xs text-stone-500 dark:text-stone-400">
                Showing {comments.length} of {total}{" "}
                {total === 1 ? "comment" : "comments"}
              </p>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-sm border border-stone-400 px-4 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 transition hover:border-black hover:bg-black hover:text-white disabled:opacity-50 dark:border-stone-600 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
              >
                {loadingMore ? "Loading…" : `Load ${PAGE_SIZE} more`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CommentThread({
  slug,
  comment,
  replies,
  onReply,
  onUpvote,
  onEdit,
  mounted,
}: {
  slug: string;
  comment: Comment;
  replies: Comment[];
  onReply: (id: string) => void;
  onUpvote: (id: string, newCount: number) => void;
  onEdit: (id: string, newBody: string) => void;
  mounted: boolean;
}) {
  const [body, setBody] = React.useState(comment.body);
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-bold uppercase text-white dark:bg-stone-700">
        {initials(comment.author)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm font-bold text-stone-900 dark:text-stone-100">
            {comment.author}
          </span>
          <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
            <TimeAgo iso={comment.createdAt} mounted={mounted} />
          </span>
        </div>
        <p className="mt-1 font-body text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
          {body}
        </p>
        <CommentActions
          slug={slug}
          commentId={comment.id}
          upvotes={comment.upvotes}
          body={body}
          createdAt={comment.createdAt}
          onReply={() => onReply(comment.id)}
          onUpvote={onUpvote}
          onEdit={(id, newBody) => {
            setBody(newBody);
            onEdit(id, newBody);
          }}
        />

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l-2 border-stone-200 pl-4 dark:border-stone-700">
            {replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                slug={slug}
                reply={reply}
                onUpvote={onUpvote}
                onEdit={onEdit}
                mounted={mounted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReplyItem({
  slug,
  reply,
  onUpvote,
  onEdit,
  mounted,
}: {
  slug: string;
  reply: Comment;
  onUpvote: (id: string, newCount: number) => void;
  onEdit: (id: string, newBody: string) => void;
  mounted: boolean;
}) {
  const [body, setBody] = React.useState(reply.body);
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-700 text-[10px] font-bold uppercase text-white dark:bg-stone-800">
        {initials(reply.author)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs font-bold text-stone-900 dark:text-stone-100">
            {reply.author}
          </span>
          <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
            <TimeAgo iso={reply.createdAt} mounted={mounted} />
          </span>
        </div>
        <p className="mt-1 font-body text-sm leading-relaxed text-stone-700 dark:text-stone-300">
          {body}
        </p>
        <CommentActions
          slug={slug}
          commentId={reply.id}
          upvotes={reply.upvotes}
          body={body}
          createdAt={reply.createdAt}
          onUpvote={onUpvote}
          onEdit={(id, newBody) => {
            setBody(newBody);
            onEdit(id, newBody);
          }}
          compact
        />
      </div>
    </div>
  );
}

function CommentActions({
  slug,
  commentId,
  upvotes,
  body,
  createdAt,
  onReply,
  onUpvote,
  onEdit,
  compact = false,
}: {
  slug: string;
  commentId: string;
  upvotes: number;
  body: string;
  createdAt: string;
  onReply?: () => void;
  onUpvote: (id: string, newCount: number) => void;
  onEdit?: (id: string, newBody: string) => void;
  compact?: boolean;
}) {
  const [voted, setVoted] = React.useState(false);
  const [voteLoading, setVoteLoading] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const [reporting, setReporting] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editText, setEditText] = React.useState(body);
  const [editing, setEditing] = React.useState(false);
  const [canEdit, setCanEdit] = React.useState(false);
  const { toast } = useToast();

  // Show the Edit button only within the 5-minute window (client-only to avoid hydration mismatch)
  React.useEffect(() => {
    setCanEdit(Date.now() - new Date(createdAt).getTime() < 5 * 60 * 1000);
  }, [createdAt]);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editText.trim() || editText.trim() === body) {
      setEditOpen(false);
      return;
    }
    setEditing(true);
    try {
      const res = await fetch(`/api/comments/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, body: editText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to edit comment");
      }
      onEdit?.(commentId, data.comment.body);
      setEditOpen(false);
      toast({ title: "Comment updated" });
    } catch (err) {
      toast({
        title: "Couldn't edit",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setEditing(false);
    }
  }

  async function handleUpvote() {
    if (voted || voteLoading) return;
    setVoteLoading(true);
    try {
      const res = await fetch(`/api/comments/${slug}/?action=upvote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to upvote");
      setVoted(true);
      onUpvote(commentId, data.upvotes);
    } catch (err) {
      toast({
        title: "Couldn't upvote",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setVoteLoading(false);
    }
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reportReason) return;
    setReporting(true);
    try {
      const res = await fetch(`/api/comments/${slug}/?action=report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, reason: reportReason, reporter: "anonymous" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit report");
      }
      toast({ title: "Reported", description: data.message });
      setReportOpen(false);
      setReportReason("");
    } catch (err) {
      toast({
        title: "Couldn't report",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        {onReply && (
          <button
            onClick={onReply}
            className="flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-red-700 dark:text-stone-400"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
        )}
        {canEdit && onEdit && (
          <button
            onClick={() => setEditOpen((v) => !v)}
            className="flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-red-700 dark:text-stone-400"
          >
            <Pencil className="h-3 w-3" />
            {!compact && "Edit"}
          </button>
        )}
        <button
          onClick={handleUpvote}
          disabled={voteLoading || voted}
          className={cn(
            "flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider transition",
            voted
              ? "text-red-700"
              : "text-stone-500 hover:text-red-700 dark:text-stone-400 disabled:opacity-50"
          )}
          aria-label={voted ? "Upvoted" : "Upvote this comment"}
        >
          <ArrowBigUp className={cn("h-3.5 w-3.5", voted && "fill-current")} />
          <span className="tabular-nums">{upvotes}</span>
        </button>
        <button
          onClick={() => setReportOpen((v) => !v)}
          className="flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-red-700 dark:text-stone-400"
          aria-label="Report this comment"
        >
          <Flag className="h-3 w-3" />
          {!compact && "Report"}
        </button>
      </div>

      {/* Report form */}
      {reportOpen && (
        <form
          onSubmit={handleReport}
          className="mt-3 rounded-sm border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-950"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Report this comment
            </span>
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              aria-label="Close report form"
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="mb-2 h-8 w-full rounded-none border border-stone-400 bg-white px-2 font-sans text-xs outline-none focus:border-black dark:border-stone-700 dark:bg-stone-900 dark:text-white"
            aria-label="Report reason"
          >
            <option value="">Choose a reason…</option>
            <option value="spam">Spam</option>
            <option value="harassment">Harassment</option>
            <option value="misinformation">Misinformation</option>
            <option value="off-topic">Off-topic</option>
            <option value="other">Other</option>
          </select>
          <Button
            type="submit"
            disabled={reporting || !reportReason}
            className="h-8 rounded-none bg-black px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {reporting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Submit report
          </Button>
        </form>
      )}

      {/* Edit form */}
      {editOpen && (
        <form
          onSubmit={handleEdit}
          className="mt-3 rounded-sm border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-950"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Edit comment
            </span>
            <button
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditText(body);
              }}
              aria-label="Close edit form"
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={1000}
            rows={3}
            className="min-h-[60px] w-full resize-none rounded-none border border-stone-400 bg-white px-2 py-1.5 font-body text-sm outline-none focus:border-black dark:border-stone-700 dark:bg-stone-900 dark:text-white"
            aria-label="Edit your comment"
            disabled={editing}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
              {editText.length}/1000 · 5-min window
            </span>
            <Button
              type="submit"
              disabled={editing || !editText.trim() || editText.trim() === body}
              className="h-8 rounded-none bg-black px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {editing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Comments;
