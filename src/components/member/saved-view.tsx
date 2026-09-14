"use client";

/**
 * Client view for `/member/saved`.
 *
 * Renders a responsive grid of saved-article cards with a "Read" button
 * linking to the article page and a "Remove" button that calls
 * `DELETE /api/saved-articles/[articleId]` and then `router.refresh()`.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Trash2, ArrowRight, BookmarkX, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { MemberShell } from "@/components/member/member-shell";
import { EmptyState } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import type { MemberUser, SavedItem } from "@/components/member/types";

interface SavedViewProps {
  user: MemberUser;
  saved: SavedItem[];
}

export function MemberSavedView({ user, saved }: SavedViewProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(articleId: string, title: string) {
    setRemoving(articleId);
    try {
      const res = await fetch(`/api/saved-articles/${encodeURIComponent(articleId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = (data && typeof data.error === "string" && data.error) || "Failed to remove.";
        toast.error(msg);
        return;
      }
      toast.success(`Removed "${title}" from your saved list.`);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <MemberShell user={user}>
      {/* Page header */}
      <div className="pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 mb-2">
          Saved Articles
        </div>
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
          Saved for later
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
          Your bookmarked stories. The most recently saved appear first.
        </p>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No saved articles yet"
          description="Tap the bookmark icon on any article to save it here for later."
          action={
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-emerald-800 transition-colors"
            >
              Discover stories <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {saved.map((s) => (
            <article
              key={s.articleId}
              className="group flex flex-col rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden hover:border-emerald-300 transition-colors"
            >
              {s.heroImage ? (
                <Link href={`/article/${s.slug}`} className="relative block aspect-[16/10] bg-stone-100 dark:bg-stone-800 overflow-hidden">
                  <img
                    src={s.heroImage}
                    alt={s.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </Link>
              ) : (
                <Link href={`/article/${s.slug}`} className="relative block aspect-[16/10] bg-stone-100 dark:bg-stone-800" />
              )}
              <div className="flex flex-col p-4 flex-1">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-2">
                  <span>{s.category}</span>
                  <span>Saved {format(parseISO(s.createdAt), "MMM d")}</span>
                </div>
                <Link
                  href={`/article/${s.slug}`}
                  className="font-headline text-base font-bold text-stone-900 dark:text-stone-50 hover:underline line-clamp-2"
                >
                  {s.title}
                </Link>
                {s.excerpt && (
                  <p className="mt-1.5 text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                    {s.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                  <Button asChild size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">
                    <Link href={`/article/${s.slug}`}>
                      Read <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(s.articleId, s.title)}
                    disabled={removing === s.articleId}
                    className="text-rose-700 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/30"
                  >
                    {removing === s.articleId ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Footer helper */}
      {saved.length > 0 && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-4 text-xs text-stone-500">
          <BookmarkX className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Removing a saved article does not delete your reading history. To
            find more stories to save, browse the{" "}
            <Link href="/" className="underline hover:text-emerald-700">
              homepage
            </Link>{" "}
            or your{" "}
            <Link href="/member/history" className="underline hover:text-emerald-700">
              reading history
            </Link>
            .
          </span>
        </div>
      )}
    </MemberShell>
  );
}
