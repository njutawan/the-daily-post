"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Global error boundary — catches errors that the root layout's error boundary
 * cannot (e.g. errors thrown during layout rendering itself).
 * Must render its own <html>/<body> since the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen items-center justify-center bg-white p-4 antialiased dark:bg-stone-950">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-700 text-white">
            <AlertTriangle className="h-8 w-8" />
          </span>

          <h1 className="mt-5 font-serif text-3xl font-bold text-black dark:text-white">
            Application Error
          </h1>
          <p className="mt-2 font-sans text-sm text-stone-600 dark:text-stone-400">
            A critical error occurred. Please try refreshing the page.
          </p>

          {error?.digest && (
            <p className="mt-3 font-sans text-xs text-stone-400">
              Error ID:{" "}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800">
                {error.digest}
              </code>
            </p>
          )}

          <button
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-black px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
