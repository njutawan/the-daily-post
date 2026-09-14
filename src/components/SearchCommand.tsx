"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, TrendingUp, CornerDownLeft } from "lucide-react";
import { allArticles, searchArticles } from "@/data/articles";
import { cn } from "@/lib/utils";

type SearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const trendingQueries = [
  "Infrastructure",
  "Supreme Court",
  "Hurricane",
  "Federal Reserve",
  "Artificial Intelligence",
];

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results = React.useMemo(() => {
    if (!query.trim()) return allArticles.slice(0, 6);
    return searchArticles(query).slice(0, 8);
  }, [query]);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(articleSlug: string) {
    onOpenChange(false);
    router.push(`/article/${articleSlug}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      go(results[activeIndex].slug);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search articles"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-lg border border-stone-300 bg-white shadow-2xl dark:border-stone-700 dark:bg-stone-900"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-stone-200 px-4 dark:border-stone-700">
          <Search className="h-5 w-5 shrink-0 text-stone-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search The Daily Post…"
            className="h-14 w-full bg-transparent font-headline text-lg text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
          />
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto newspaper-scroll">
          {!query.trim() && (
            <div className="px-4 pt-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <TrendingUp className="h-3.5 w-3.5" />
                Trending searches
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {trendingQueries.map((t) => (
                  <button
                    key={t}
                    onClick={() => setQuery(t)}
                    className="rounded-full border border-stone-300 px-3 py-1 font-sans text-xs text-stone-700 hover:border-black hover:bg-black hover:text-white dark:border-stone-600 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Latest stories
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="font-headline text-lg text-stone-700 dark:text-stone-300">
                No results for “{query}”
              </p>
              <p className="mt-1 font-sans text-sm text-stone-500">
                Try a different keyword, or browse a section from the menu.
              </p>
            </div>
          ) : (
            <ul className="py-2">
              {results.map((article, i) => (
                <li key={article.slug}>
                  <button
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => go(article.slug)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      i === activeIndex
                        ? "bg-stone-100 dark:bg-stone-800"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800/60"
                    )}
                  >
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <Image
                        src={article.imageUrl}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-red-700">
                          {article.category}
                        </span>
                        <span className="font-sans text-[10px] text-stone-400">
                          {article.time}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate font-headline text-[15px] font-bold leading-snug text-stone-900 dark:text-stone-100">
                        {article.title}
                      </p>
                    </div>
                    {i === activeIndex && (
                      <CornerDownLeft className="h-4 w-4 shrink-0 text-stone-400" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 px-4 py-2 font-sans text-[11px] text-stone-500 dark:border-stone-700">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-stone-300 px-1 dark:border-stone-600">↑</kbd> <kbd className="rounded border border-stone-300 px-1 dark:border-stone-600">↓</kbd> navigate</span>
            <span><kbd className="rounded border border-stone-300 px-1 dark:border-stone-600">↵</kbd> open</span>
            <span><kbd className="rounded border border-stone-300 px-1 dark:border-stone-600">esc</kbd> close</span>
          </div>
          {query.trim() ? (
            <button
              onClick={() => {
                onOpenChange(false);
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
              className="font-semibold uppercase tracking-wider text-red-700 hover:underline"
            >
              See all results →
            </button>
          ) : (
            <span className="font-semibold uppercase tracking-wider">
              {results.length} result{results.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchCommand;
