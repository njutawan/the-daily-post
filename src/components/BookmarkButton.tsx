"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";

const STORAGE_KEY = "tdp:bookmarks";
const BOOKMARKS_CHANGED_EVENT = "tdp:bookmarks-changed";
const EMPTY_BOOKMARKS: string[] = [];

let cachedBookmarkRaw: string | null | undefined;
let cachedBookmarks = EMPTY_BOOKMARKS;

// ---------------------------------------------------------------------------
// Local-storage layer (fallback for anonymous users + static articles)
// ---------------------------------------------------------------------------

function parseBookmarks(raw: string | null): string[] {
  if (!raw) return EMPTY_BOOKMARKS;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : EMPTY_BOOKMARKS;
  } catch {
    return EMPTY_BOOKMARKS;
  }
}

function readBookmarks(): string[] {
  return getBookmarksSnapshot();
}

function getBookmarksSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_BOOKMARKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedBookmarkRaw) {
      cachedBookmarkRaw = raw;
      cachedBookmarks = parseBookmarks(raw);
    }
  } catch {
    return cachedBookmarks;
  }
  return cachedBookmarks;
}

function writeBookmarks(slugs: string[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(slugs);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedBookmarkRaw = raw;
    cachedBookmarks = [...slugs];
    window.dispatchEvent(new CustomEvent(BOOKMARKS_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

function subscribeToBookmarks(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(BOOKMARKS_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(BOOKMARKS_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getBookmarksServerSnapshot(): string[] {
  return EMPTY_BOOKMARKS;
}

export function useBookmarks() {
  return React.useSyncExternalStore(
    subscribeToBookmarks,
    getBookmarksSnapshot,
    getBookmarksServerSnapshot
  );
}

/**
 * Toggle a bookmark locally (localStorage). Used for static articles
 * that don't exist in the database, and as a fallback when the server
 * API is unavailable or the user is anonymous.
 */
export function toggleBookmarkLocal(slug: string): boolean {
  const current = readBookmarks();
  const exists = current.includes(slug);
  const next = exists ? current.filter((s) => s !== slug) : [...current, slug];
  writeBookmarks(next);
  return !exists;
}

// ---------------------------------------------------------------------------
// Server-synced layer (for signed-in users + DB articles)
// ---------------------------------------------------------------------------

/**
 * Check whether the current session is signed in. We avoid importing the
 * unified-auth provider here to keep this component dependency-light;
 * a single fetch to /api/auth/me is enough.
 */
async function fetchIsSignedIn(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.user != null;
  } catch {
    return false;
  }
}

/**
 * Save (POST) or unsave (DELETE) an article on the server. Falls back
 * gracefully when the user is anonymous or the article isn't a DB row.
 *
 * @returns `"server"` if the server op succeeded, `"local"` if we fell
 *          back to localStorage, `null` if the op failed entirely.
 */
async function toggleBookmarkServer(
  slug: string,
  nowSaved: boolean
): Promise<"server" | "local" | null> {
  try {
    if (nowSaved) {
      // Save on the server.
      const res = await fetch("/api/saved-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.ok) return "server";
      // 401 = not signed in, 403 = not a published DB article — fall
      // back to local storage in both cases.
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        toggleBookmarkLocal(slug);
        return "local";
      }
      return null;
    } else {
      // Unsave on the server.
      const res = await fetch(`/api/saved-articles/${slug}`, {
        method: "DELETE",
      });
      if (res.ok) return "server";
      if (res.status === 401 || res.status === 404) {
        toggleBookmarkLocal(slug);
        return "local";
      }
      return null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type BookmarkButtonProps = {
  slug: string;
  className?: string;
  variant?: "icon" | "pill";
};

export function BookmarkButton({ slug, className, variant = "icon" }: BookmarkButtonProps) {
  const bookmarks = useBookmarks();
  const hydrated = useHydrated();
  const [serverSavedSlug, setServerSavedSlug] = React.useState<string | null>(null);
  const [optimistic, setOptimistic] = React.useState<{ slug: string; saved: boolean } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const localSaved = bookmarks.includes(slug);
  const saved = optimistic?.slug === slug
    ? optimistic.saved
    : localSaved || serverSavedSlug === slug;

  // Check whether this slug is saved on the server for signed-in readers.
  React.useEffect(() => {
    let cancelled = false;
    const localHas = readBookmarks().includes(slug);

    fetchIsSignedIn().then(async (signed) => {
      if (cancelled || !signed) return;

      try {
        const res = await fetch("/api/saved-articles", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const serverSlugs: string[] = (data.saved ?? [])
          .map((item: { article?: { slug?: string }; articleId?: string }) =>
            item.article?.slug ?? item.articleId
          )
          .filter((value: unknown): value is string => typeof value === "string");
        if (cancelled || !serverSlugs.includes(slug)) return;

        setServerSavedSlug(slug);
        // Avoid tracking the same saved article in both places.
        if (localHas) {
          writeBookmarks(readBookmarks().filter((savedSlug) => savedSlug !== slug));
        }
      } catch {
        // ignore — local state is the fallback
      }
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const wasSaved = saved;
    const nowSaved = !wasSaved;
    setOptimistic({ slug, saved: nowSaved });

    // Try the server first (it handles the signed-in check + falls back
    // to localStorage when appropriate).
    const result = await toggleBookmarkServer(slug, nowSaved);

    if (result === null) {
      // Server + local fallback both failed — the derived state still
      // reflects the value from before the optimistic update.
      toast.error("Couldn't save the article. Please try again.");
    } else if (result === "local") {
      // Local-only save (including the anonymous fallback), with no toast spam.
      setServerSavedSlug((current) => (current === slug ? null : current));
    } else if (result === "server") {
      setServerSavedSlug((current) => {
        if (nowSaved) return slug;
        return current === slug ? null : current;
      });
      toast.success(nowSaved ? "Saved to your reading list" : "Removed from saved");
    }

    setOptimistic(null);
    setBusy(false);
  }

  if (variant === "pill") {
    return (
      <button
        onClick={handleClick}
        disabled={busy}
        aria-label={saved ? "Remove from saved" : "Save article"}
        className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50",
          saved
            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
            : "border-stone-300 text-stone-700 hover:border-black hover:text-black dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:text-white",
          className
        )}
      >
        <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-label={saved ? "Remove from saved" : "Save article"}
      title={saved ? "Remove from saved" : "Save article"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-50",
        saved
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-stone-300 text-stone-600 hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black",
        className
      )}
    >
      {hydrated ? <Bookmark className={cn("h-4 w-4", saved && "fill-current")} /> : <Bookmark className="h-4 w-4 opacity-0" />}
    </button>
  );
}

export default BookmarkButton;
