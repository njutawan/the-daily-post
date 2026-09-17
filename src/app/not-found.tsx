import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-lg text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="font-logo text-5xl text-black dark:text-white">
              The Daily Post
            </span>
          </div>

          <h1 className="font-headline text-7xl font-black leading-none text-black dark:text-white sm:text-8xl">
            404
          </h1>
          <p className="mt-4 font-headline text-2xl font-bold text-stone-700 dark:text-stone-300">
            This page could not be found.
          </p>
          <p className="mt-2 font-body text-base italic text-stone-500 dark:text-stone-400">
            The story may have moved, expired, or never existed.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-black px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 border border-stone-400 px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:text-black dark:border-stone-600 dark:text-stone-300 dark:hover:border-white dark:hover:text-white"
            >
              <SearchIcon className="h-3.5 w-3.5" />
              Search the archive
            </Link>
          </div>

          <div className="mt-10 border-t border-stone-200 pt-6 dark:border-stone-800">
            <p className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Popular sections
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {["Politics", "World", "Tech", "Climate", "Sports", "Most Read"].map(
                (s) => (
                  <Link
                    key={s}
                    href={
                      s === "Most Read" ? "/most-read" : `/category/${s.toLowerCase()}`
                    }
                    className="rounded-full border border-stone-300 px-3 py-1 font-sans text-xs text-stone-600 hover:border-black hover:text-black dark:border-stone-700 dark:text-stone-400 dark:hover:border-white dark:hover:text-white"
                  >
                    {s}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
