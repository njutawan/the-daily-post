import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/db";
import { ArrowLeft, Users, Download, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Subscribers — The Daily Post Admin",
  description: "Newsletter subscriber list and conversion sources.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  let subscribers: Array<{
    id: string;
    email: string;
    source: string;
    createdAt: Date;
  }> = [];
  let error: string | null = null;

  try {
    subscribers = await db.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, source: true, createdAt: true },
    });
  } catch (err) {
    console.error("[/admin/subscribers] error", err);
    error = "Failed to load subscribers.";
  }

  const sourceCounts = subscribers.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-[1400px] px-4 py-8">
            <div className="flex items-center justify-between">
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Moderation queue
              </Link>
              <a
                href="/api/admin/subscribers/export"
                className="flex items-center gap-1.5 rounded-sm bg-black px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-black"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </a>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-headline text-4xl font-black leading-none text-black dark:text-white">
                  Subscribers
                </h1>
                <p className="mt-1 font-body text-base italic text-stone-600 dark:text-stone-400">
                  {subscribers.length} {subscribers.length === 1 ? "reader" : "readers"} subscribed to The Daily Post.
                </p>
              </div>
            </div>

            {/* Source breakdown */}
            <div className="mt-6 flex flex-wrap gap-3">
              {Object.entries(sourceCounts).map(([source, count]) => (
                <div
                  key={source}
                  className="rounded-sm border border-stone-300 bg-white px-4 py-2 dark:border-stone-700 dark:bg-stone-950"
                >
                  <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {source}
                  </span>
                  <span className="ml-2 font-headline text-2xl font-black text-red-700 tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subscriber list */}
        <section>
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            {error ? (
              <div className="rounded-sm border border-red-300 bg-red-50 p-4 font-sans text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40">
                {error}
              </div>
            ) : subscribers.length === 0 ? (
              <div className="border border-dashed border-stone-300 py-16 text-center dark:border-stone-700">
                <Mail className="mx-auto h-10 w-10 text-stone-400" />
                <h2 className="mt-3 font-headline text-2xl font-bold text-stone-600 dark:text-stone-400">
                  No subscribers yet
                </h2>
                <p className="mt-1 font-sans text-sm text-stone-500 dark:text-stone-500">
                  When readers sign up for a newsletter, they&rsquo;ll appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black text-left dark:border-white">
                      <th className="px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                        Email
                      </th>
                      <th className="px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                        Source
                      </th>
                      <th className="px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                        Subscribed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-stone-200 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-900"
                      >
                        <td className="px-3 py-3 font-sans text-sm text-stone-900 dark:text-stone-100">
                          {s.email}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-sm bg-stone-200 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                            {s.source}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-sans text-xs text-stone-500 dark:text-stone-400">
                          {s.createdAt.toLocaleString("en-US", { timeZone: "UTC" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
