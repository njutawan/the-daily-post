import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/db";
import { getArticleBySlug, allArticles } from "@/data/articles";
import { ArrowLeft, Eye, MessageSquare, Type, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Article Insights — The Daily Post Admin",
  description: "Per-article engagement metrics.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return allArticles.map((a) => ({ slug: a.slug }));
}

export default async function AdminArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  let views = 0;
  let comments: Array<{
    id: string;
    author: string;
    body: string;
    upvotes: number;
    createdAt: Date;
  }> = [];
  let typos: Array<{
    id: string;
    quotedText: string;
    correction: string;
    status: string;
    createdAt: Date;
  }> = [];

  try {
    [views, comments, typos] = await Promise.all([
      db.articleView.count({ where: { articleSlug: slug } }),
      db.comment.findMany({
        where: { articleSlug: slug },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, author: true, body: true, upvotes: true, createdAt: true },
      }),
      db.typoReport.findMany({
        where: { articleSlug: slug },
        orderBy: { createdAt: "desc" },
        select: { id: true, quotedText: true, correction: true, status: true, createdAt: true },
      }),
    ]);
  } catch (err) {
    console.error("[/admin/article/[slug]] error", err);
  }

  const totalUpvotes = comments.reduce((sum, c) => sum + c.upvotes, 0);
  const pendingTypos = typos.filter((t) => t.status === "pending").length;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <div className="mt-3">
              <Link
                href={`/article/${slug}`}
                className="font-sans text-[11px] font-bold uppercase tracking-wider text-red-700 hover:underline"
              >
                {article.category}
              </Link>
              <h1 className="mt-2 font-headline text-3xl font-black leading-tight text-black dark:text-white sm:text-4xl">
                {article.title}
              </h1>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-sm border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                <Eye className="h-5 w-5 text-red-700" />
                <p className="mt-2 font-headline text-3xl font-black tabular-nums text-black dark:text-white">
                  {views.toLocaleString()}
                </p>
                <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Views
                </p>
              </div>
              <div className="rounded-sm border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                <MessageSquare className="h-5 w-5 text-stone-700 dark:text-stone-300" />
                <p className="mt-2 font-headline text-3xl font-black tabular-nums text-black dark:text-white">
                  {comments.length.toLocaleString()}
                </p>
                <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Comments
                </p>
              </div>
              <div className="rounded-sm border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                <Clock className="h-5 w-5 text-stone-700 dark:text-stone-300" />
                <p className="mt-2 font-headline text-3xl font-black tabular-nums text-black dark:text-white">
                  {totalUpvotes.toLocaleString()}
                </p>
                <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Upvotes
                </p>
              </div>
              <div className="rounded-sm border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-950">
                <Type className="h-5 w-5 text-stone-700 dark:text-stone-300" />
                <p className="mt-2 font-headline text-3xl font-black tabular-nums text-black dark:text-white">
                  {typos.length}
                </p>
                <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Typos {pendingTypos > 0 && `(${pendingTypos} pending)`}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent comments */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <h2 className="mb-4 border-b-2 border-black pb-2 font-headline text-xl font-black text-black dark:border-white dark:text-white">
              Recent Comments
            </h2>
            {comments.length === 0 ? (
              <p className="font-sans text-sm text-stone-500 dark:text-stone-400">
                No comments yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {comments.slice(0, 10).map((c) => (
                  <li key={c.id} className="rounded-sm border border-stone-200 p-3 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-sm font-bold text-stone-900 dark:text-stone-100">
                        {c.author}
                      </span>
                      <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        {c.createdAt.toLocaleString("en-US", { timeZone: "UTC" })}
                      </span>
                      <span className="ml-auto flex items-center gap-1 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        <Clock className="h-3 w-3" />
                        <span className="tabular-nums">{c.upvotes}</span>
                      </span>
                    </div>
                    <p className="mt-1.5 font-body text-sm leading-relaxed text-stone-700 dark:text-stone-300">
                      {c.body.length > 120 ? c.body.slice(0, 120) + "…" : c.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Typo reports */}
        <section>
          <div className="mx-auto max-w-3xl px-4 py-8">
            <h2 className="mb-4 border-b-2 border-black pb-2 font-headline text-xl font-black text-black dark:border-white dark:text-white">
              Typo Reports
            </h2>
            {typos.length === 0 ? (
              <p className="font-sans text-sm text-stone-500 dark:text-stone-400">
                No typo reports for this article.
              </p>
            ) : (
              <ul className="space-y-3">
                {typos.map((t) => (
                  <li key={t.id} className="rounded-sm border border-stone-200 p-3 dark:border-stone-800">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          t.status === "applied"
                            ? "rounded-sm bg-green-700 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white"
                            : t.status === "dismissed"
                              ? "rounded-sm bg-stone-500 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white"
                              : "rounded-sm bg-red-700 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white"
                        }
                      >
                        {t.status}
                      </span>
                      <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        {t.createdAt.toLocaleString("en-US", { timeZone: "UTC" })}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <p className="rounded-sm border-l-2 border-red-700 bg-stone-50 px-2 py-1 font-body text-xs italic text-stone-700 dark:bg-stone-900 dark:text-stone-300">
                        {t.quotedText}
                      </p>
                      <p className="rounded-sm border-l-2 border-green-700 bg-green-50 px-2 py-1 font-body text-xs text-stone-700 dark:bg-green-950/30 dark:text-stone-300">
                        {t.correction}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
