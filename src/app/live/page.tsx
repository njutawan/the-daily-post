import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LiveFeed } from "@/components/LiveFeed";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Updates — The Daily Post",
  description:
    "Live coverage is not available yet. This page will show newsroom-published updates only; sample posts are disabled.",
  openGraph: {
    title: "Live Updates — The Daily Post",
    description: "Live coverage is not available yet. Only newsroom-published updates will appear here.",
    type: "article",
  },
};

export default function LivePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        <section className="border-b-2 border-stone-300 bg-stone-50 dark:border-stone-700 dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <span className="mt-5 inline-flex bg-stone-200 px-2.5 py-1 font-sans text-xs font-bold uppercase tracking-wider text-stone-700 dark:bg-stone-800 dark:text-stone-300">
              Newsroom live desk
            </span>
            <h1 className="mt-3 font-headline text-4xl font-black leading-tight text-black dark:text-white sm:text-5xl">
              Live updates
            </h1>
            <p className="mt-3 font-body text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              Only updates published by our editors appear in this feed. Sample and automatically generated posts are never shown.
            </p>
          </div>
        </section>

        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <LiveFeed />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
