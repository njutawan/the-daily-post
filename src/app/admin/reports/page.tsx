import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/db";
import { ArrowLeft, Flag, MessageSquare, Users, ExternalLink, Type } from "lucide-react";
import { DeleteReportButton } from "./DeleteReportButton";
import { DeleteCommentButton } from "./DeleteCommentButton";
import { LogoutButton } from "./LogoutButton";

export const metadata: Metadata = {
  title: "Moderation Queue — The Daily Post",
  description: "Review and action reported comments.",
  robots: { index: false, follow: false },
};

type ReportRow = {
  reportId: string;
  reason: string;
  reporter: string;
  reportedAt: Date;
  commentId: string;
  commentBody: string;
  commentAuthor: string;
  articleSlug: string;
  upvotes: number;
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  let reports: ReportRow[] = [];
  let error: string | null = null;

  try {
    const rows = await db.commentReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    // Join with comments manually (avoids a Prisma relation setup)
    const commentIds = [...new Set(rows.map((r) => r.commentId))];
    const comments = await db.comment.findMany({
      where: { id: { in: commentIds } },
    });
    const commentMap = new Map(comments.map((c) => [c.id, c]));
    reports = rows
      .map((r) => {
        const c = commentMap.get(r.commentId);
        if (!c) return null;
        return {
          reportId: r.id,
          reason: r.reason,
          reporter: r.reporter,
          reportedAt: r.createdAt,
          commentId: c.id,
          commentBody: c.body,
          commentAuthor: c.author,
          articleSlug: c.articleSlug,
          upvotes: c.upvotes,
        };
      })
      .filter((x): x is ReportRow => x !== null);
  } catch (err) {
    console.error("[/admin/reports] error", err);
    error = "Failed to load reports.";
  }

  // Count pending typo reports for the admin nav badge
  let typoCount = 0;
  try {
    typoCount = await db.typoReport.count({ where: { status: "pending" } });
  } catch {
    /* ignore */
  }

  const reasonCounts = reports.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] || 0) + 1;
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
              <div className="flex items-center gap-4">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <Link
                  href="/"
                  className="inline-flex items-center font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
                >
                  Homepage
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/subscribers"
                  className="flex items-center gap-1.5 rounded-sm border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:text-black dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:text-white"
                >
                  <Users className="h-3.5 w-3.5" />
                  Subscribers
                </Link>
                <Link
                  href="/admin/typos"
                  className="flex items-center gap-1.5 rounded-sm border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:text-black dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:text-white"
                >
                  <Type className="h-3.5 w-3.5" />
                  Typos
                  {typoCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-red-700 px-1.5 text-[10px] font-bold text-white tabular-nums">
                      {typoCount}
                    </span>
                  )}
                </Link>
                <LogoutButton />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-700 text-white">
                <Flag className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-headline text-4xl font-black leading-none text-black dark:text-white">
                  Moderation Queue
                </h1>
                <p className="mt-1 font-body text-base italic text-stone-600 dark:text-stone-400">
                  Review reported comments and take action.
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-sm border border-stone-300 bg-white px-4 py-2 dark:border-stone-700 dark:bg-stone-950">
                <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Total reports
                </span>
                <span className="ml-2 font-headline text-2xl font-black text-black dark:text-white tabular-nums">
                  {reports.length}
                </span>
              </div>
              {Object.entries(reasonCounts).map(([reason, count]) => (
                <div
                  key={reason}
                  className="rounded-sm border border-stone-300 bg-white px-4 py-2 dark:border-stone-700 dark:bg-stone-950"
                >
                  <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {reason}
                  </span>
                  <span className="ml-2 font-headline text-2xl font-black text-red-700 tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
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
                <Flag className="mx-auto h-10 w-10 text-stone-400" />
                <h2 className="mt-3 font-headline text-2xl font-bold text-stone-600 dark:text-stone-400">
                  No reports in the queue
                </h2>
                <p className="mt-1 font-sans text-sm text-stone-500 dark:text-stone-500">
                  When readers flag a comment, it will appear here for review.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((r) => (
                  <article
                    key={r.reportId}
                    className="rounded-sm border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950"
                  >
                    <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
                      <span className="flex items-center gap-1 rounded-sm bg-red-700 px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wider text-white">
                        <Flag className="h-3 w-3" />
                        {r.reason}
                      </span>
                      <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        Reported by <span className="font-semibold text-stone-700 dark:text-stone-300">{r.reporter}</span>
                      </span>
                      <span className="font-sans text-[11px] text-stone-400">·</span>
                      <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        {r.reportedAt.toLocaleString("en-US", { timeZone: "UTC" })}
                      </span>
                      <Link
                        href={`/article/${r.articleSlug}#conversation`}
                        className="ml-auto flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-red-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View article
                      </Link>
                    </div>

                    <div className="mt-3 flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-800 text-[11px] font-bold uppercase text-white dark:bg-stone-700">
                        {r.commentAuthor
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-sm font-bold text-stone-900 dark:text-stone-100">
                            {r.commentAuthor}
                          </span>
                          <span className="flex items-center gap-1 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                            <MessageSquare className="h-3 w-3" />
                            <span className="tabular-nums">{r.upvotes}</span> upvotes
                          </span>
                        </div>
                        <p className="mt-1 font-body text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                          {r.commentBody}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
                      <DeleteReportButton reportId={r.reportId} />
                      <DeleteCommentButton commentId={r.commentId} reportId={r.reportId} />
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
