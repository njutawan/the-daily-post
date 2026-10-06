"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bookmark, Lock, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useBookmarks } from "@/components/BookmarkButton";
import type { ArticleSummary } from "@/lib/article-summary";

export function SavedArticlesView({ articles }: { articles: ArticleSummary[] }) {
  const bookmarks = useBookmarks();
  const [removedKey, setRemovedKey] = useState(0);
  const saved = articles.filter((article) => bookmarks.includes(article.slug));

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-[1400px] px-4 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                <Bookmark className="h-5 w-5 fill-current" />
              </span>
              <div>
                <h1 className="font-headline text-4xl font-black leading-none text-black dark:text-white sm:text-5xl">
                  Saved
                </h1>
                <p className="mt-1 font-body text-base italic text-stone-600 dark:text-stone-400">
                  {saved.length === 0
                    ? "Articles you save will appear here."
                    : `${saved.length} ${saved.length === 1 ? "article" : "articles"} saved — stored on this device.`}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            {saved.length === 0 ? (
              <div className="mx-auto max-w-lg py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-stone-300 dark:border-stone-700">
                  <Bookmark className="h-7 w-7 text-stone-400" />
                </div>
                <h2 className="font-headline text-2xl font-bold text-black dark:text-white">
                  Nothing saved yet
                </h2>
                <p className="mt-2 font-sans text-sm text-stone-500 dark:text-stone-400">
                  Tap the bookmark icon on any article to save it for later. Your saved stories live on this device.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 bg-black px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200"
                >
                  Browse the homepage
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between border-b-2 border-black pb-3 dark:border-white">
                  <h2 className="font-headline text-2xl font-black text-black dark:text-white">
                    Your saved stories
                  </h2>
                  <button
                    onClick={() => {
                      window.localStorage.removeItem("tdp:bookmarks");
                      window.dispatchEvent(new CustomEvent("tdp:bookmarks-changed"));
                      setRemovedKey((key) => key + 1);
                    }}
                    className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear all
                  </button>
                </div>
                <div key={removedKey} className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                  {saved.map((article) => (
                    <article key={article.slug} className="group flex flex-col">
                      <Link
                        href={`/article/${article.slug}`}
                        className="relative mb-3 block aspect-[16/10] w-full overflow-hidden bg-stone-100"
                      >
                        <Image
                          src={article.imageUrl}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </Link>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-none border border-stone-400 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                          {article.category}
                        </span>
                        {article.premium && (
                          <span className="flex items-center gap-0.5 rounded-sm bg-stone-900 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400">
                            <Lock className="h-2 w-2" />
                            Premium
                          </span>
                        )}
                      </div>
                      <Link href={`/article/${article.slug}`} className="font-headline text-xl font-bold leading-tight text-black dark:text-white">
                        {article.title}
                      </Link>
                      {article.deck && (
                        <p className="mt-2 line-clamp-3 font-body text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
                          {article.deck}
                        </p>
                      )}
                      <p className="mt-3 text-[11px] font-sans text-stone-500">
                        {article.author} · {article.readTime} min read
                      </p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
