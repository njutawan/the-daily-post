import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LiveFeed } from "@/components/LiveFeed";
import { liveUpdates, leadArticle } from "@/data/articles";
import { ArrowLeft, Bell, Share2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Live: Infrastructure Bill — The Daily Post",
  description:
    "Live updates, reactions, and analysis as the Senate passes the $1.2 trillion infrastructure package.",
  openGraph: {
    title: "Live: Infrastructure Bill — The Daily Post",
    description: "Live updates from the Senate floor and beyond.",
    type: "article",
  },
};

export default function LivePage() {
  const sorted = [...liveUpdates].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const lead = sorted[0];

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Live hero band */}
        <section className="border-b-2 border-red-700 bg-stone-50 dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-red-700 px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-wider text-white">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Live
              </span>
              <span className="font-sans text-xs text-stone-500 dark:text-stone-400">
                Updated 2 minutes ago
              </span>
            </div>
            <h1 className="mt-3 font-headline text-4xl font-black leading-tight text-black dark:text-white sm:text-5xl">
              Infrastructure Bill: Live coverage from the Senate floor
            </h1>
            <p className="mt-3 font-body text-lg italic text-stone-600 dark:text-stone-400">
              The Senate passed the $1.2 trillion package 68-32 shortly after midnight. We're tracking reactions, next steps, and what it means for the country.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black">
                <Bell className="h-3.5 w-3.5" />
                Get updates
              </button>
              <button className="flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black">
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
              <span className="flex items-center gap-1.5 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-700 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-700" />
                </span>
                Auto-refreshing every 60s
              </span>
            </div>
          </div>
        </section>

        {/* Live feed */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <LiveFeed initialUpdates={sorted} />

            {/* Read the full story CTA */}
            <div className="mt-10 border-t border-stone-200 pt-8 dark:border-stone-800">
              <h3 className="font-headline text-xl font-bold text-black dark:text-white">
                Read the full story
              </h3>
              <p className="mt-1 font-body text-[15px] text-stone-600 dark:text-stone-400">
                Our lead report on the vote, the compromise, and what comes next in the House.
              </p>
              <Link
                href={`/article/${leadArticle.slug}`}
                className="mt-3 inline-flex items-center gap-2 border-b-2 border-black pb-0.5 font-sans text-sm font-bold uppercase tracking-wider text-black transition-all hover:gap-3 dark:border-white dark:text-white"
              >
                {leadArticle.title.slice(0, 48)}… →
              </Link>
            </div>
          </div>
        </section>

        {/* Most recent highlight recap */}
        <section className="border-b border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="mb-4 font-headline text-2xl font-black text-black dark:text-white">
              The latest, in brief
            </h2>
            <div className="rounded-sm border border-stone-300 bg-white p-5 dark:border-stone-700 dark:bg-stone-950">
              <div className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-wider text-red-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-700 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-700" />
                </span>
                {lead.time}
              </div>
              <h3 className="mt-2 font-headline text-2xl font-bold text-black dark:text-white">
                {lead.title}
              </h3>
              <p className="mt-2 font-body text-base leading-relaxed text-stone-700 dark:text-stone-300">
                {lead.body}
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
