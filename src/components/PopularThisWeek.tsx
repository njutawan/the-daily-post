import Link from "next/link";
import Image from "next/image";
import { getPopularThisWeek } from "@/lib/popular";
import { Eye, MessageSquare, Flame, TrendingUp } from "lucide-react";

export async function PopularThisWeek() {
  const popular = await getPopularThisWeek(5);

  if (popular.length === 0) return null;

  return (
    <section className="border-b border-stone-200 dark:border-stone-800">
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        <div className="flex items-end justify-between border-b-2 border-black pb-3 dark:border-white">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-700" />
            <h2 className="font-headline text-3xl font-black text-black dark:text-white">
              Popular This Week
            </h2>
          </div>
          <span className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            <TrendingUp className="h-3.5 w-3.5" />
            By views, upvotes &amp; comments
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-5">
          {popular.map((article, i) => (
            <article key={article.slug} className="group flex flex-col">
              <div className="flex items-center gap-3">
                <span className="font-headline text-4xl font-black leading-none text-stone-200 dark:text-stone-700">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative h-12 w-16 shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <Image
                    src={article.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
              <Link href={`/article/${article.slug}`} className="mt-3 block">
                <h3 className="font-headline text-base font-bold leading-snug text-black dark:text-white">
                  <span className="headline-link decoration-stone-900 dark:decoration-white">
                    {article.title.length > 80
                      ? article.title.slice(0, 80) + "…"
                      : article.title}
                  </span>
                </h3>
              </Link>
              <div className="mt-2 flex items-center gap-3 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                {article.views > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span className="tabular-nums">{article.views}</span>
                  </span>
                )}
                {article.commentCount > 0 && (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span className="tabular-nums">{article.commentCount}</span>
                  </span>
                )}
                <span className="font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  {article.category}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PopularThisWeek;
