import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsletterUnsubscribeFlow } from "@/components/NewsletterUnsubscribeFlow";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe from Newsletters — The Daily Post",
  description: "Manage or unsubscribe from The Daily Post newsletters.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />
      <main className="flex-1">
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-2xl px-4 py-12">
            <Link
              href="/newsletters"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to newsletters
            </Link>
            <h1 className="mt-5 font-headline text-4xl font-black text-black dark:text-white">
              Unsubscribe
            </h1>
            <p className="mt-3 font-body text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              You can stop The Daily Post newsletter emails at any time. We&apos;ll use a secure email link to make sure only the address owner can unsubscribe.
            </p>
            <NewsletterUnsubscribeFlow token={token} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
