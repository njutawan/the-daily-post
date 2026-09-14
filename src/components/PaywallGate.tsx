"use client";

import * as React from "react";
import Link from "next/link";
import { useUnifiedAuth } from "@/components/unified-auth-provider";
import { trackRead, isPaywalled, getReadStatus, FREE_LIMIT } from "@/lib/paywall";
import { Lock, Check } from "lucide-react";

type PaywallGateProps = {
  slug: string;
  isPremium: boolean;
  children: React.ReactNode;
};

/**
 * Paywall gate component for article pages.
 * - Premium articles: gate immediately for non-subscribers (show 2 paragraphs, blur rest)
 * - Free articles: track reads, gate after FREE_LIMIT articles per month
 * - Subscribers: unlimited access, no gate
 */
export function PaywallGate({ slug, isPremium, children }: PaywallGateProps) {
  const { user, loading } = useUnifiedAuth();
  const [paywallState, setPaywallState] = React.useState<"loading" | "open" | "gated">("loading");
  const [readCount, setReadCount] = React.useState(0);

  React.useEffect(() => {
    if (loading) return;

    const isSubscriber =
      user?.subTier === "digital" ||
      user?.subTier === "allaccess" ||
      user?.role === "admin";

    if (isSubscriber) {
      setPaywallState("open");
      return;
    }

    // Track this read for metering (non-premium only)
    if (!isPremium) {
      const count = trackRead(slug);
      setReadCount(count);
      if (count >= FREE_LIMIT) {
        setPaywallState("gated");
        return;
      }
    } else {
      // Premium articles: always gated for non-subscribers
      setReadCount(getReadStatus().count);
      setPaywallState("gated");
      return;
    }

    setPaywallState("open");
  }, [user, loading, slug, isPremium]);

  if (paywallState === "loading" || paywallState === "open") {
    return <>{children}</>;
  }

  // Gated: blur the content and show paywall CTA
  return (
    <>
      {/* Show children but blurred */}
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm overflow-hidden max-h-[400px]" aria-hidden="true">
          {children}
        </div>
        {/* Gradient fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent dark:from-stone-950" />

        {/* Paywall overlay */}
        <div className="relative z-10 mx-auto -mt-20 max-w-lg px-4 py-8 text-center">
          <div className="rounded-lg border border-stone-300 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
              <Lock className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-headline text-2xl font-black text-black dark:text-white">
              {isPremium ? "Subscriber Exclusive" : "You've reached your free article limit"}
            </h2>
            <p className="mt-2 font-body text-base text-stone-600 dark:text-stone-400">
              {isPremium
                ? "This article is available exclusively to subscribers. Join us for unlimited access to in-depth reporting."
                : `You've read ${readCount} of ${FREE_LIMIT} free articles this month. Subscribe for unlimited access.`}
            </p>

            {/* Pricing preview */}
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/subscribe"
                className="w-full rounded-none bg-black px-6 py-3 font-sans text-sm font-bold uppercase tracking-wider text-white hover:bg-stone-800 sm:w-auto dark:bg-white dark:text-black dark:hover:bg-stone-200"
              >
                Subscribe — from $4.99/mo
              </Link>
              {user ? null : (
                <Link
                  href="/member"
                  className="w-full rounded-none border border-stone-400 px-6 py-3 font-sans text-sm font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:text-black sm:w-auto dark:border-stone-600 dark:text-stone-300 dark:hover:border-white dark:hover:text-white"
                >
                  Already a subscriber? Sign in
                </Link>
              )}
            </div>

            {/* Feature list */}
            <ul className="mt-5 space-y-1.5 text-left">
              {[
                "Unlimited articles, every month",
                "Ad-free reading experience",
                "AI-narrated audio (TTS)",
                "Subscriber-only investigations",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 font-sans text-sm text-stone-600 dark:text-stone-400">
                  <Check className="h-4 w-4 shrink-0 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export default PaywallGate;
