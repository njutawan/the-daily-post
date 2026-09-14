"use client";

/**
 * Client view for `/member/history`.
 *
 * Renders a filterable, searchable list of the user's reading history.
 * Each row shows title, category, last-read date, a progress bar
 * colored by completion, and a "Continue reading" link.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { History, Search, ArrowRight, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";

import { MemberShell } from "@/components/member/member-shell";
import { EmptyState } from "@/components/dashboard/shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  progressColor,
  type HistoryItem,
  type MemberUser,
} from "@/components/member/types";

type FilterKey = "all" | "in_progress" | "completed";

interface HistoryViewProps {
  user: MemberUser;
  history: HistoryItem[];
}

export function MemberHistoryView({ user, history }: HistoryViewProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((h) => {
      if (q && !h.title.toLowerCase().includes(q)) return false;
      if (filter === "in_progress") return h.progress > 0 && h.progress < 100;
      if (filter === "completed") return h.progress >= 100;
      return true;
    });
  }, [history, filter, search]);

  const counts = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    for (const h of history) {
      if (h.progress >= 100) completed++;
      else if (h.progress > 0) inProgress++;
    }
    return { all: history.length, in_progress: inProgress, completed };
  }, [history]);

  return (
    <MemberShell user={user}>
      {/* Page header */}
      <div className="pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 mb-2">
          Reading History
        </div>
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
          Your reading history
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
          The last 50 articles you&rsquo;ve read. Pick up any of them right where
          you left off.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="inline-flex rounded-md border border-stone-200 dark:border-stone-800 overflow-hidden">
          {(
            [
              { key: "all", label: `All (${counts.all})` },
              { key: "in_progress", label: `In progress (${counts.in_progress})` },
              { key: "completed", label: `Completed (${counts.completed})` },
            ] as { key: FilterKey; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === t.key
                  ? "bg-emerald-700 text-white"
                  : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <Input
            placeholder="Search by title…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={history.length === 0 ? "No reading history yet" : "No matches"}
          description={
            history.length === 0
              ? "Start reading an article and we'll track your progress here."
              : "Try a different filter or search term."
          }
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
        <ul className="space-y-3">
          {filtered.map((h) => (
            <li
              key={h.articleId}
              className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 hover:border-emerald-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-stone-500 mb-1">
                    <History className="h-3 w-3" />
                    {h.category}
                    <span>·</span>
                    <span>Last read {format(parseISO(h.lastReadAt), "MMM d, yyyy")}</span>
                  </div>
                  <Link
                    href={`/article/${h.slug}`}
                    className="font-headline text-base font-bold text-stone-900 dark:text-stone-50 hover:underline"
                  >
                    {h.title}
                  </Link>
                  {h.excerpt && (
                    <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                      {h.excerpt}
                    </p>
                  )}
                  <div className="mt-3 max-w-md">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1">
                      <span>
                        {h.progress >= 100
                          ? "Completed"
                          : h.progress === 0
                            ? "Just opened"
                            : `${h.progress}% complete`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(h.progress)}`}
                        style={{ width: `${h.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:self-center">
                  <Button
                    asChild
                    variant="outline"
                    className="hover:border-emerald-500 hover:text-emerald-700"
                  >
                    <Link href={`/article/${h.slug}`}>
                      {h.progress >= 100 ? "Re-read" : "Continue"}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </MemberShell>
  );
}
