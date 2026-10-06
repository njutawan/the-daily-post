import Link from "next/link";
import { Check, Lock } from "lucide-react";

export type PaywallGateProps = {
  isPremium: boolean;
  isSignedIn: boolean;
  readCount: number;
  limit: number;
};

/**
 * Server-rendered paywall notice. ArticlePage only renders this component when
 * the server has decided not to render the full article body. Do not pass the
 * protected body as children: restricted content must never enter the RSC/HTML
 * response for a reader without access.
 */
export function PaywallGate({
  isPremium,
  isSignedIn,
  readCount,
  limit,
}: PaywallGateProps) {
  return (
    <section
      aria-labelledby="paywall-title"
      className="mx-auto my-8 max-w-lg rounded-lg border border-stone-300 bg-white p-6 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900"
    >
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 id="paywall-title" className="mt-4 font-headline text-2xl font-black text-black dark:text-white">
        {isPremium ? "Subscriber Exclusive" : "You’ve reached your free article limit"}
      </h2>
      <p className="mt-2 font-body text-base text-stone-600 dark:text-stone-400">
        {isPremium
          ? "This article is available to subscribers. Subscribe for unlimited access to in-depth reporting."
          : `You’ve read ${readCount} of ${limit} free articles this month. Subscribe for unlimited access.`}
      </p>

      <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/subscribe"
          className="w-full rounded-none bg-black px-6 py-3 font-sans text-sm font-bold uppercase tracking-wider text-white hover:bg-stone-800 sm:w-auto dark:bg-white dark:text-black dark:hover:bg-stone-200"
        >
          Subscribe — from $4.99/mo
        </Link>
        {!isSignedIn && (
          <Link
            href="/member"
            className="w-full rounded-none border border-stone-400 px-6 py-3 font-sans text-sm font-bold uppercase tracking-wider text-stone-700 hover:border-black hover:text-black sm:w-auto dark:border-stone-600 dark:text-stone-300 dark:hover:border-white dark:hover:text-white"
          >
            Already a subscriber? Sign in
          </Link>
        )}
      </div>

      <ul className="mt-5 space-y-1.5 text-left">
        {[
          "Unlimited articles, every month",
          "Ad-free reading experience",
          "AI-narrated audio (TTS)",
          "Subscriber-only investigations",
        ].map((feature) => (
          <li key={feature} className="flex items-center gap-2 font-sans text-sm text-stone-600 dark:text-stone-400">
            <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PaywallGate;
