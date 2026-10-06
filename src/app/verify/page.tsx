import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VerifySubscription } from "@/components/VerifySubscription";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm Your Newsletter — The Daily Post",
  description: "Confirm your email address to complete your newsletter subscription.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type VerifyPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
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
              Confirm your email
            </h1>
            <p className="mt-3 font-body text-lg leading-relaxed text-stone-600 dark:text-stone-400">
              Confirm below to finish signing up for The Daily Post newsletters. Opening this page alone does not activate the subscription.
            </p>
            <VerifySubscription token={token} />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
