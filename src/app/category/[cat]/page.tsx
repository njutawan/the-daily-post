import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleCard } from "@/components/ArticleCard";
import { AdUnit } from "@/components/AdUnit";
import {
  getArticlesByCategory,
  categories,
  categoryCounts,
} from "@/data/articles";
import { ArrowLeft, Rss } from "lucide-react";

export function generateStaticParams() {
  return categories
    .filter((c) => c !== "Live")
    .map((c) => ({ cat: c.toLowerCase() }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const categoryName =
    categories.find((c) => c.toLowerCase() === cat.toLowerCase()) ?? cat;
  return {
    title: `${categoryName} — The Daily Post`,
    description: `The latest ${categoryName} coverage from The Daily Post newsroom.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ cat: string }>;
}) {
  const { cat } = await params;
  const categoryName = categories.find(
    (c) => c.toLowerCase() === cat.toLowerCase()
  );
  if (!categoryName || categoryName === "Live") notFound();

  const articles = getArticlesByCategory(categoryName);
  const [lead, ...rest] = articles;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Category hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-[1400px] px-4 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h1 className="font-headline text-5xl font-black leading-none text-black dark:text-white sm:text-6xl">
                  {categoryName}
                </h1>
                <p className="mt-2 font-body text-lg italic text-stone-600 dark:text-stone-400">
                  {categoryTagline(categoryName)}
                </p>
              </div>
              <button className="hidden items-center gap-1.5 border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black sm:flex">
                <Rss className="h-3.5 w-3.5" />
                Follow
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-300 pt-4 dark:border-stone-700">
              {categories
                .filter((c) => c !== "Live")
                .map((c) => {
                  const count = categoryCounts.find((x) => x.name === c)?.count ?? 0;
                  const active = c.toLowerCase() === cat.toLowerCase();
                  return (
                    <Link
                      key={c}
                      href={`/category/${c.toLowerCase()}`}
                      className={
                        active
                          ? "rounded-full bg-black px-3 py-1 font-sans text-xs font-bold uppercase tracking-wider text-white dark:bg-white dark:text-black"
                          : "rounded-full border border-stone-300 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wider text-stone-600 hover:border-black hover:text-black dark:border-stone-700 dark:text-stone-400 dark:hover:border-white dark:hover:text-white"
                      }
                    >
                      {c} <span className="opacity-60">({count})</span>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>

        {articles.length === 0 ? (
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <h2 className="font-headline text-3xl font-bold text-black dark:text-white">
              No stories yet in {categoryName}
            </h2>
            <p className="mt-2 font-sans text-stone-500">
              Check back soon — our reporters are on it.
            </p>
          </div>
        ) : (
          <section className="border-b border-stone-200 dark:border-stone-800">
            <div className="mx-auto max-w-[1400px] px-4 py-10">
              {/* Lead */}
              {lead && (
                <div className="grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-12">
                  <div className="lg:col-span-8 lg:border-r lg:border-stone-300 lg:pr-8 dark:lg:border-stone-800">
                    <ArticleCard article={lead} layout="hero" />
                  </div>
                  <aside className="lg:col-span-4">
                    <div className="flex items-center justify-between border-b-2 border-black pb-2 dark:border-white">
                      <span className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-red-700">
                        More in {categoryName}
                      </span>
                      <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                        {articles.length} stories
                      </span>
                    </div>
                    <ol className="divide-y divide-stone-300 dark:divide-stone-800">
                      {rest.slice(0, 5).map((article, i) => (
                        <li key={article.slug} className="py-3.5">
                          <ArticleCard
                            article={article}
                            layout="compact"
                            index={i + 1}
                            showImage={false}
                          />
                        </li>
                      ))}
                    </ol>
                  </aside>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Category Banner Ad (728×90) */}
        <div className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-[1400px] px-4 py-4">
            <AdUnit size="leaderboard" slotId="category-banner" label="Advertisement" />
          </div>
        </div>

        {/* All stories grid */}
        {rest.length > 5 && (
          <section className="border-b border-stone-200 dark:border-stone-800">
            <div className="mx-auto max-w-[1400px] px-4 py-10">
              <h2 className="mb-6 border-b-2 border-black pb-3 font-headline text-2xl font-black text-black dark:border-white dark:text-white">
                All {categoryName} Coverage
              </h2>
              <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((article) => (
                  <ArticleCard key={article.slug} article={article} layout="standard" />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function categoryTagline(name: string): string {
  switch (name) {
    case "Politics":
      return "Power, policy, and the people who shape them.";
    case "Opinions":
      return "Voices from across the spectrum, every weekday.";
    case "World":
      return "Reporting from the front lines of a changing world.";
    case "Tech":
      return "The companies, the code, and the consequences.";
    case "Business":
      return "Markets, money, and the economy that moves them.";
    case "Climate":
      return "A planet in flux — and the race to understand it.";
    case "Sports":
      return "The games, the stakes, and the people who play them.";
    default:
      return "Independent reporting you can trust.";
  }
}
