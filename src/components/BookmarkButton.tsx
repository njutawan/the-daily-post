"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tdp:bookmarks";

// ---------------------------------------------------------------------------
// Local-storage layer (fallback for anonymous users + static articles)
// ---------------------------------------------------------------------------

function readBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeBookmarks(slugs: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    window.dispatchEvent(new CustomEvent("tdp:bookmarks-changed"));
  } catch {
    /* ignore */
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = React.useState<string[]>([]);

  React.useEffect(() => {
    setBookmarks(readBookmarks());
    const onChange = () => setBookmarks(readBookmarks());
    window.addEventListener("tdp:bookmarks-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("tdp:bookmarks-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return bookmarks;
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
  const [saved, setSaved] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState<boolean | null>(null);

  // On mount, check: (a) is the slug in localStorage? (b) is the user
  // signed in? If signed in, also query the server for the true state.
  React.useEffect(() => {
    setMounted(true);
    const localHas = readBookmarks().includes(slug);
    setSaved(localHas);

    fetchIsSignedIn().then(async (signed) => {
      setSignedIn(signed);
      if (signed) {
        // Ask the server whether this slug is already saved.
        try {
          const res = await fetch("/api/saved-articles", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            const serverSlugs: string[] = (data.saved ?? [])
              .map((s: { article?: { slug?: string }; articleId?: string }) =>
                s.article?.slug ?? s.articleId
              )
              .filter((x: unknown): x is string => typeof x === "string");
            if (serverSlugs.includes(slug)) {
              setSaved(true);
              // Also remove from localStorage so we don't double-track.
              if (localHas) {
                writeBookmarks(readBookmarks().filter((s) => s !== slug));
              }
            }
          }
        } catch {
          // ignore — local state is the fallback
        }
      }
    });

    const onChange = () => setSaved(readBookmarks().includes(slug));
    window.addEventListener("tdp:bookmarks-changed", onChange);
    return () => window.removeEventListener("tdp:bookmarks-changed", onChange);
  }, [slug]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const wasSaved = saved;
    const nowSaved = !wasSaved;
    // Optimistic update.
    setSaved(nowSaved);

    // Try the server first (it handles the signed-in check + falls back
    // to localStorage when appropriate).
    const result = await toggleBookmarkServer(slug, nowSaved);

    if (result === null) {
      // Server + local fallback both failed — revert.
      setSaved(wasSaved);
      toast.error("Couldn't save the article. Please try again.");
    } else if (result === "local" && signedIn === false) {
      // Anonymous user — local-only save, no toast spam.
    } else if (result === "server") {
      toast.success(nowSaved ? "Saved to your reading list" : "Removed from saved");
    }

    // Re-sync local state (the server toggleBookmarkLocal call may have
    // written to localStorage).
    setSaved(readBookmarks().includes(slug) || (result === "server" && nowSaved));
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
      {mounted ? <Bookmark className={cn("h-4 w-4", saved && "fill-current")} /> : <Bookmark className="h-4 w-4 opacity-0" />}
    </button>
  );
}

export default BookmarkButton;
