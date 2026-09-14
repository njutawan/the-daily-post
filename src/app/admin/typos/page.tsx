import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/db";
import { allArticles } from "@/data/articles";
import { ArrowLeft, Type, Download, ExternalLink } from "lucide-react";
import { TypoStatusButton } from "./TypoStatusButton";

export const metadata: Metadata = {
  title: "Typo Reports — The Daily Post Admin",
  description: "Review reader-submitted typo corrections.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type TypoRow = {
  id: string;
  articleSlug: string;
  articleTitle: string;
  quotedText: string;
  correction: string;
  reporter: string;
  status: string;
  createdAt: Date;
};

export default async function AdminTyposPage() {
  let reports: TypoRow[] = [];
  let error: string | null = null;

  try {
    const rows = await db.typoReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const articleMap = new Map(
      allArticles.map((a) => [a.slug, a.title])
    );
    reports = rows.map((r) => ({
      id: r.id,
      articleSlug: r.articleSlug,
      articleTitle: articleMap.get(r.articleSlug) || r.articleSlug,
      quotedText: r.quotedText,
      correction: r.correction,
      reporter: r.reporter,
      status: r.status,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error("[/admin/typos] error", err);
    error = "Failed to load typo reports.";
  }

  const statusCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-[1400px] px-4 py-8">
            <div className="flex items-center justify-between">
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Moderation queue
              </Link>
              <a
                href="/api/admin/typos/export"
                className="flex items-center gap-1.5 rounded-sm bg-black px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-black"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </a>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                <Type className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-headline text-4xl font-black leading-none text-black dark:text-white">
                  Typo Reports
                </h1>
                <p className="mt-1 font-body text-base italic text-stone-600 dark:text-stone-400">
                  {reports.length} {reports.length === 1 ? "reader-submitted correction" : "reader-submitted corrections"} for the copy desk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reports list */}
        <section>
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            {error ? (
              <div className="rounded-sm border border-red-300 bg-red-50 p-4 font-sans text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40">
                {error}
              </div>
            ) : reports.length === 0 ? (
              <div className="border border-dashed border-stone-300 py-16 text-center dark:border-stone-700">
                <Type className="mx-auto h-10 w-10 text-stone-400" />
                <h2 className="mt-3 font-headline text-2xl font-bold text-stone-600 dark:text-stone-400">
                  No typo reports
                </h2>
                <p className="mt-1 font-sans text-sm text-stone-500 dark:text-stone-500">
                  When readers flag a typo, it will appear here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-sm border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950"
                  >
                    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
                      <Link
                        href={`/article/${r.articleSlug}`}
                        className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-red-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {r.articleTitle.length > 50
                          ? r.articleTitle.slice(0, 50) + "…"
                          : r.articleTitle}
                      </Link>
                      <span
                        className={
                          r.status === "applied"
                            ? "rounded-sm bg-green-700 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white"
                            : r.status === "dismissed"
                              ? "rounded-sm bg-stone-500 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white"
                              : "rounded-sm bg-red-700 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white"
                        }
                      >
                        {r.status}
                      </span>
                      <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        · Reported by <span className="font-semibold text-stone-700 dark:text-stone-300">{r.reporter}</span>
                      </span>
                      <span className="font-sans text-[11px] text-stone-400">·</span>
                      <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        {r.createdAt.toLocaleString("en-US", { timeZone: "UTC" })}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <h3 className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          Quoted text
                        </h3>
                        <p className="rounded-sm border-l-2 border-red-700 bg-stone-50 px-3 py-2 font-body text-sm italic text-stone-700 dark:bg-stone-900 dark:text-stone-300">
                          {r.quotedText}
                        </p>
                      </div>
                      <div>
                        <h3 className="mb-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          Suggested correction
                        </h3>
                        <p className="rounded-sm border-l-2 border-green-700 bg-green-50 px-3 py-2 font-body text-sm text-stone-700 dark:bg-green-950/30 dark:text-stone-300">
                          {r.correction}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
                      {r.status !== "applied" && (
                        <TypoStatusButton reportId={r.id} status="applied" label="Mark as applied" />
                      )}
                      {r.status !== "dismissed" && (
                        <TypoStatusButton reportId={r.id} status="dismissed" label="Dismiss" />
                      )}
                      {r.status !== "pending" && (
                        <TypoStatusButton reportId={r.id} status="pending" label="Reopen" />
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
