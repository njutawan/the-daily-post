import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getMostRead } from "@/lib/popular";
import { ArrowLeft, Eye, MessageSquare, TrendingUp, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Most Read — The Daily Post",
  description: "The most-read articles from The Daily Post newsroom, ranked by views.",
};

export const dynamic = "force-dynamic";

export default async function MostReadPage() {
  const articles = await getMostRead(10);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-headline text-4xl font-black leading-none text-black dark:text-white sm:text-5xl">
                  Most Read
                </h1>
                <p className="mt-1 font-body text-base italic text-stone-600 dark:text-stone-400">
                  The stories our readers couldn&rsquo;t stop reading — ranked by all-time views.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Leaderboard */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            {articles.length === 0 ? (
              <div className="border border-dashed border-stone-300 py-16 text-center dark:border-stone-700">
                <Eye className="mx-auto h-10 w-10 text-stone-400" />
                <h2 className="mt-3 font-headline text-2xl font-bold text-stone-600 dark:text-stone-400">
                  No views recorded yet
                </h2>
                <p className="mt-1 font-sans text-sm text-stone-500 dark:text-stone-500">
                  As readers visit articles, the most-read leaderboard will fill in.
                </p>
              </div>
            ) : (
              <ol className="space-y-1">
                {articles.map((article, i) => (
                  <li
                    key={article.slug}
                    className="group flex items-stretch gap-4 border-b border-stone-200 py-5 last:border-b-0 dark:border-stone-800"
                  >
                    {/* Rank number */}
                    <span
                      className={
                        i < 3
                          ? "flex w-12 shrink-0 items-start font-headline text-5xl font-black leading-none text-red-700"
                          : "flex w-12 shrink-0 items-start font-headline text-5xl font-black leading-none text-stone-300 dark:text-stone-700"
                      }
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Thumbnail */}
                    <Link
                      href={`/article/${article.slug}`}
                      className="relative hidden h-20 w-28 shrink-0 overflow-hidden bg-stone-100 sm:block dark:bg-stone-800"
                    >
                      <Image
                        src={article.imageUrl}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <Link href={`/article/${article.slug}`} className="block">
                        <h2 className="font-headline text-xl font-bold leading-snug text-black dark:text-white sm:text-2xl">
                          <span className="headline-link decoration-stone-900 dark:decoration-white">
                            {article.title}
                          </span>
                        </h2>
                      </Link>
                      {article.deck && (
                        <p className="mt-1.5 font-body text-[15px] leading-relaxed text-stone-600 dark:text-stone-400 line-clamp-2">
                          {article.deck}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-3 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                        {article.views > 0 && (
                          <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-red-700">
                            <Eye className="h-3.5 w-3.5" />
                            <span className="tabular-nums">{article.views.toLocaleString()}</span>
                            <span>{article.views === 1 ? "view" : "views"}</span>
                          </span>
                        )}
                        {article.commentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span className="tabular-nums">{article.commentCount}</span>
                          </span>
                        )}
                        <span className="font-semibold uppercase tracking-wider">
                          {article.category}
                        </span>
                        <span>·</span>
                        <span>{article.time}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-stone-50 dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-8 text-center">
            <TrendingUp className="mx-auto h-6 w-6 text-red-700" />
            <p className="mt-2 font-headline text-lg font-bold text-black dark:text-white">
              Reading counts. Every visit helps surface the stories that matter.
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center gap-2 border-b-2 border-black pb-0.5 font-sans text-sm font-bold uppercase tracking-wider text-black transition-all hover:gap-3 dark:border-white dark:text-white"
            >
              Browse more stories →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
