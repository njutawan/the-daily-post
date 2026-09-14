import Link from "next/link";
import { getTrendingTopics } from "@/lib/popular";
import { TrendingUp, Eye } from "lucide-react";

export async function TrendingTopics() {
  const topics = await getTrendingTopics(5);

  if (topics.length === 0) return null;

  const maxViews = Math.max(...topics.map((t) => t.views), 1);

  return (
    <section className="border-b border-stone-200 dark:border-stone-800">
      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="flex items-center gap-2 border-b-2 border-black pb-3 dark:border-white">
          <TrendingUp className="h-4 w-4 text-red-700" />
          <h2 className="font-headline text-2xl font-black text-black dark:text-white">
            Trending Topics
          </h2>
          <span className="ml-auto font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            This week · by views
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {topics.map((topic, i) => {
            const pct = Math.round((topic.views / maxViews) * 100);
            return (
              <Link
                key={topic.category}
                href={`/category/${topic.category.toLowerCase()}`}
                className="group flex flex-col rounded-sm border border-stone-200 bg-white p-4 transition hover:border-black hover:shadow-md dark:border-stone-800 dark:bg-stone-950 dark:hover:border-white"
              >
                <div className="flex items-center justify-between">
                  <span className="font-headline text-3xl font-black text-stone-200 dark:text-stone-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {topic.views > 0 && (
                    <span className="flex items-center gap-1 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                      <Eye className="h-3 w-3" />
                      <span className="tabular-nums">{topic.views}</span>
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-headline text-lg font-bold leading-snug text-black dark:text-white">
                  <span className="headline-link decoration-stone-900 dark:decoration-white">
                    {topic.category}
                  </span>
                </h3>
                <p className="mt-1 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                  {topic.articleCount} {topic.articleCount === 1 ? "article" : "articles"}
                </p>
                {topic.views > 0 && (
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                    <div
                      className="h-full rounded-full bg-red-700 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TrendingTopics;
