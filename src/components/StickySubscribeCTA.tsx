"use client";

import * as React from "react";
import Link from "next/link";
import { X, Lock } from "lucide-react";

/**
 * Sticky subscribe CTA — appears on article pages after the reader
 * scrolls past 50% of the article. Non-intrusive: bottom bar above
 * the mobile bottom nav, dismissible, and hidden for subscribers.
 *
 * The CTA appears ONCE per session (sessionStorage) so it doesn't
 * annoy returning readers on every article.
 */
export function StickySubscribeCTA() {
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    // Don't show if already dismissed this session.
    try {
      if (sessionStorage.getItem("tdp:sticky-cta-dismissed")) {
        setDismissed(true);
        return;
      }
    } catch {
      // sessionStorage not available (SSR) — ignore.
    }

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        const max = document.body.scrollHeight - window.innerHeight;
        const pct = max > 0 ? scrolled / max : 0;
        // Show after 50% scroll, hide in the last 15% (footer zone).
        setVisible(pct > 0.5 && pct < 0.85);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    try {
      sessionStorage.setItem("tdp:sticky-cta-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  if (dismissed || !visible) return null;

  return (
    <div
      className="fixed bottom-14 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 md:bottom-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="region"
      aria-label="Subscribe promotion"
    >
      <div className="flex items-center gap-3 rounded-lg border border-stone-300 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-900">
          <Lock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-sans text-sm font-bold text-stone-900 dark:text-stone-50">
            Enjoy unlimited reading
          </div>
          <div className="font-sans text-xs text-stone-500 dark:text-stone-400">
            From <span className="font-bold">$4.99/mo</span> · Cancel anytime
          </div>
        </div>
        <Link
          href="/subscribe"
          className="shrink-0 rounded-md bg-stone-900 px-4 py-2 font-sans text-xs font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
        >
          Subscribe
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default StickySubscribeCTA;
