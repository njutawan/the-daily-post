"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

type VerifySubscriptionProps = {
  token: string;
};

export function VerifySubscription({ token }: VerifySubscriptionProps) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = React.useState("");

  async function confirmSubscription() {
    setStatus("loading");
    try {
      const response = await fetch(
        `/api/subscribe?verify=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "We couldn't verify this subscription.");
      }
      setMessage(data.message || "Your email address is confirmed.");
      setStatus("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try the link again.");
      setStatus("error");
    }
  }

  return (
    <div className="mt-6">
      {!token ? (
        <p role="alert" className="font-sans text-sm text-red-700 dark:text-red-400">
          This verification link is missing its token. Please sign up again.
        </p>
      ) : status === "done" ? (
        <div className="flex items-start gap-3 border border-green-300 bg-green-50 p-4 text-left dark:border-green-900 dark:bg-green-950/30">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-400" />
          <p className="font-sans text-sm text-green-900 dark:text-green-200">{message}</p>
        </div>
      ) : (
        <>
          {status === "error" && (
            <p role="alert" className="mb-4 font-sans text-sm text-red-700 dark:text-red-400">
              {message}
            </p>
          )}
          <button
            type="button"
            onClick={confirmSubscription}
            disabled={status === "loading"}
            className="inline-flex h-11 items-center justify-center gap-2 bg-black px-5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-stone-200"
          >
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === "loading" ? "Confirming…" : "Confirm my subscription"}
          </button>
        </>
      )}
    </div>
  );
}
