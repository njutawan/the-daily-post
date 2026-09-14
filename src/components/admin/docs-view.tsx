"use client";

/**
 * Documentation lookup view — a newsroom-friendly interface for the
 * Context7 docs API.
 *
 * Workflow:
 *   1. Type a library name → debounced search → list of matches.
 *   2. Click a result → fetch the full docs → render in a code-styled
 *      panel with copy + "open source URL" actions.
 *   3. Optional topic filter narrows the docs (e.g. "middleware",
 *      "server actions").
 *
 * Powered by:
 *   - GET /api/docs/search?q=<query>
 *   - GET /api/docs/[libraryId]?topic=<topic>
 *
 * Why this exists in a newsroom admin area: reporters and editors
 * frequently reference library docs when writing tech/business coverage.
 * Having docs lookup built into the admin means they don't need to
 * context-switch to MDN or the Next.js docs site.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, BookOpen, Copy, Check, ExternalLink, Library } from "lucide-react";
import { toast } from "sonner";
import { DashboardPageHeader, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Context7Library {
  id: string;
  name: string;
  description?: string;
  version?: string;
  trustScore?: number;
  snippets?: number;
  sourceUrls?: string[];
}

interface Props {
  user: AdminShellUser;
}

export function AdminDocsView({ user }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Context7Library[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Context7Library | null>(null);
  const [topic, setTopic] = useState("");
  const [docs, setDocs] = useState<string>("");
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [copied, setCopied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — fire when the user stops typing for 400ms.
  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/docs/search?q=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Fetch docs when a library is selected or the topic filter changes.
  const fetchDocs = useCallback(
    async (lib: Context7Library, topicFilter?: string) => {
      setLoadingDocs(true);
      setDocs("");
      try {
        const params = new URLSearchParams();
        params.set("topic", topicFilter || "");
        // Context7 IDs contain a "/" (e.g. "/vercel/next.js") — strip the
        // leading "/" so it becomes a 2-segment path: "vercel/next.js".
        // The catch-all [...libraryId] route reassembles it.
        const pathId = lib.id.replace(/^\//, "");
        const res = await fetch(
          `/api/docs/${pathId}?${params.toString()}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Docs fetch failed");
        }
        const data = await res.json();
        setDocs(data.content || "(no content returned)");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to fetch docs"
        );
        setDocs("");
      } finally {
        setLoadingDocs(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selected) {
      // Fetch docs when a library is selected. The topic filter is NOT
      // in deps — typing in the topic field shouldn't re-fetch on
      // every keystroke. The "Filter" button calls fetchDocs explicitly.
      fetchDocs(selected, topic);
    }
  }, [selected, fetchDocs]);

  function handleSelect(lib: Context7Library) {
    setSelected(lib);
    setDocs("");
  }

  function handleTopicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected) {
      fetchDocs(selected, topic);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(docs);
      setCopied(true);
      toast.success("Docs copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <AdminShell user={user}>
      <DashboardPageHeader
        eyebrow="Documentation"
        title="Library docs lookup"
        description="Search up-to-date documentation for any library via Context7. Type a library name, pick a result, and read the latest docs inline."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Search + results column */}
        <section className="lg:col-span-1">
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search libraries… e.g. next.js, prisma"
                className="pl-9"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-stone-400" />
              )}
            </div>

            {/* Results list */}
            <ul className="mt-3 space-y-1 max-h-[600px] overflow-y-auto">
              {results.length === 0 && query.trim().length >= 2 && !searching && (
                <li className="px-3 py-8 text-center text-sm text-stone-500">
                  No libraries found. Try a different query.
                </li>
              )}
              {results.map((lib) => (
                <li key={lib.id}>
                  <button
                    onClick={() => handleSelect(lib)}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2 transition-colors",
                      selected?.id === lib.id
                        ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                        : "hover:bg-stone-100 dark:hover:bg-stone-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Library className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="font-sans text-sm font-medium truncate">
                        {lib.name}
                      </span>
                      {lib.version && (
                        <span className="font-sans text-[10px] uppercase tracking-wider text-stone-500">
                          v{lib.version}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-stone-500 truncate pl-5.5">
                      {lib.id}
                    </div>
                    {lib.description && (
                      <p className="mt-0.5 pl-5.5 text-xs text-stone-500 line-clamp-1">
                        {lib.description}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Docs viewer column */}
        <section className="lg:col-span-2">
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 min-h-[600px]">
            {!selected ? (
              <EmptyState
                icon={BookOpen}
                title="Pick a library to view its docs"
                description="Search for a library on the left, then click a result to fetch the latest documentation inline."
              />
            ) : (
              <>
                {/* Docs header */}
                <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
                      {selected.name}
                    </div>
                    <div className="font-mono text-[11px] text-stone-500">
                      {selected.id}
                    </div>
                  </div>
                  {/* Topic filter */}
                  <form onSubmit={handleTopicSubmit} className="flex items-center gap-2">
                    <Input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="topic filter (e.g. middleware)"
                      className="h-8 w-48 text-xs"
                    />
                    <Button type="submit" size="sm" disabled={loadingDocs} className="h-8 text-xs">
                      {loadingDocs ? <Loader2 className="h-3 w-3 animate-spin" /> : "Filter"}
                    </Button>
                  </form>
                  {/* Copy */}
                  <Button
                    onClick={handleCopy}
                    size="sm"
                    variant="outline"
                    disabled={!docs || loadingDocs}
                    className="h-8 text-xs"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  {/* Source URL */}
                  {selected.sourceUrls && selected.sourceUrls[0] && (
                    <a
                      href={selected.sourceUrls[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-sans text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Source
                    </a>
                  )}
                </div>

                {/* Docs body */}
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                    <span className="ml-2 text-sm text-stone-500">Fetching docs…</span>
                  </div>
                ) : docs ? (
                  <pre className="overflow-x-auto rounded-md bg-stone-50 dark:bg-stone-950 p-4 font-mono text-xs leading-relaxed text-stone-700 dark:text-stone-300 max-h-[700px] overflow-y-auto">
                    {docs}
                  </pre>
                ) : (
                  <p className="py-8 text-center text-sm text-stone-500">
                    No documentation available for this library.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
