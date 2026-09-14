"use client";

import * as React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-700 text-white">
            <AlertTriangle className="h-8 w-8" />
          </span>

          <h1 className="mt-5 font-headline text-4xl font-black text-black dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 font-body text-base text-stone-600 dark:text-stone-400">
            An unexpected error occurred while rendering this page. Our team has been
            notified.
          </p>

          {error?.digest && (
            <p className="mt-3 font-sans text-xs text-stone-400">
              Error ID: <code className="rounded bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800">{error.digest}</code>
            </p>
          )}

          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-black px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-stone-400 px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:text-black dark:border-stone-600 dark:text-stone-300 dark:hover:border-white dark:hover:text-white"
            >
              <Home className="h-3.5 w-3.5" />
              Homepage
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
