"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

type NewsletterUnsubscribeFlowProps = {
  token: string;
};

type FlowStatus = "idle" | "loading" | "sent" | "done" | "error";

export function NewsletterUnsubscribeFlow({ token }: NewsletterUnsubscribeFlowProps) {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<FlowStatus>("idle");
  const [message, setMessage] = React.useState("");
  const [developmentUrl, setDevelopmentUrl] = React.useState("");

  async function submitRequestLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setDevelopmentUrl("");

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "We couldn't process this request.");
      }
      setStatus("sent");
      setMessage(data.message || "If this address is subscribed, we'll email an unsubscribe link.");
      if (typeof data.unsubscribeUrl === "string") {
        setDevelopmentUrl(data.unsubscribeUrl);
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Please try again later.");
    }
  }

  async function confirmUnsubscribe() {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "We couldn't complete the unsubscribe request.");
      }
      setStatus("done");
      setMessage(data.message || "You have been unsubscribed from the newsletters.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Please request a new link and try again.");
    }
  }

  if (token) {
    return (
      <div className="mt-6">
        {status === "done" ? (
          <div className="flex items-start gap-3 border border-green-300 bg-green-50 p-4 text-left dark:border-green-900 dark:bg-green-950/30">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700 dark:text-green-400" />
            <p className="font-sans text-sm text-green-900 dark:text-green-200">{message}</p>
          </div>
        ) : (
          <>
            <p className="font-sans text-sm leading-relaxed text-stone-600 dark:text-stone-400">
              For your protection, opening this link does not unsubscribe you automatically. Confirm below to stop newsletter emails.
            </p>
            {status === "error" && (
              <p role="alert" className="mt-3 font-sans text-sm text-red-700 dark:text-red-400">
                {message}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={confirmUnsubscribe}
                disabled={status === "loading"}
                className="inline-flex h-11 items-center justify-center gap-2 bg-black px-5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-stone-200"
              >
                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === "loading" ? "Processing…" : "Confirm unsubscribe"}
              </button>
              {status === "error" && (
                <Link href="/unsubscribe" className="font-sans text-xs font-semibold underline underline-offset-4">
                  Request a new link
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="font-sans text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        Enter the email address you subscribed with. We&apos;ll send a secure confirmation link if it has a newsletter subscription.
      </p>
      <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={submitRequestLink}>
        <label className="sr-only" htmlFor="unsubscribe-email">Email address</label>
        <input
          id="unsubscribe-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status === "loading"}
          placeholder="Your email address"
          className="h-11 min-w-0 flex-1 border border-stone-300 bg-white px-3 font-sans text-sm outline-none focus:border-black disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-white dark:focus:border-white"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-black px-5 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-stone-200"
        >
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === "loading" ? "Sending…" : "Email me a link"}
        </button>
      </form>
      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`mt-4 font-sans text-sm ${status === "error" ? "text-red-700 dark:text-red-400" : "text-stone-600 dark:text-stone-400"}`}
        >
          {message}
        </p>
      )}
      {developmentUrl && (
        <p className="mt-2 font-sans text-sm">
          <a className="font-semibold underline underline-offset-4" href={developmentUrl}>
            Open the development unsubscribe link
          </a>
        </p>
      )}
    </div>
  );
}
