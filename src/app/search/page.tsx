import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleCard } from "@/components/ArticleCard";
import { searchArticles, allArticles } from "@/data/articles";
import { ArrowLeft, Search as SearchIcon, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Search — The Daily Post",
  description: "Search The Daily Post newsroom for the stories that matter.",
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query ? searchArticles(query) : [];
  const trending = allArticles.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Search hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <h1 className="mt-4 font-headline text-4xl font-black text-black dark:text-white sm:text-5xl">
              Search The Daily Post
            </h1>
            <p className="mt-2 font-body text-lg italic text-stone-600 dark:text-stone-400">
              {query
                ? `Showing results for “${query}”`
                : "Find reporting, opinion, and analysis across the newsroom."}
            </p>

            {/* Server-rendered search form (GET → /search?q=) */}
            <form action="/search" method="get" className="mt-6 flex items-center gap-2 border-b-2 border-black pb-2 dark:border-white">
              <SearchIcon className="h-5 w-5 shrink-0 text-stone-500 dark:text-stone-400" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                autoFocus
                placeholder="Search headlines, authors, topics…"
                className="w-full bg-transparent font-headline text-lg text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-100"
                aria-label="Search query"
              />
              <button
                type="submit"
                className="shrink-0 bg-black px-4 py-1.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200"
              >
                Search
              </button>
            </form>

            {/* Tip chips */}
            {!query && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Try:
                </span>
                {["Infrastructure", "Supreme Court", "Climate", "Federal Reserve", "AI"].map((t) => (
                  <Link
                    key={t}
                    href={`/search?q=${encodeURIComponent(t)}`}
                    className="rounded-full border border-stone-300 px-3 py-1 font-sans text-xs text-stone-700 hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Results */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            {query && (
              <div className="mb-6 flex items-baseline justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
                <h2 className="font-headline text-2xl font-black text-black dark:text-white">
                  {results.length === 0
                    ? "No matches"
                    : `${results.length} ${results.length === 1 ? "result" : "results"}`}
                </h2>
                <span className="font-sans text-xs text-stone-500">for “{query}”</span>
              </div>
            )}

            {query && results.length === 0 ? (
              <div className="mx-auto max-w-xl py-12 text-center">
                <p className="font-headline text-2xl font-bold text-stone-700 dark:text-stone-300">
                  We couldn't find anything for “{query}”.
                </p>
                <p className="mt-2 font-sans text-sm text-stone-500">
                  Check your spelling, try a broader term, or browse the latest stories below.
                </p>
              </div>
            ) : query ? (
              <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((article) => (
                  <ArticleCard key={article.slug} article={article} layout="standard" />
                ))}
              </div>
            ) : (
              <div>
                <div className="mb-6 flex items-center gap-2 border-b-2 border-black pb-3 dark:border-white">
                  <TrendingUp className="h-4 w-4 text-red-700" />
                  <h2 className="font-headline text-2xl font-black text-black dark:text-white">
                    Latest stories
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {trending.map((article) => (
                    <ArticleCard key={article.slug} article={article} layout="standard" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
