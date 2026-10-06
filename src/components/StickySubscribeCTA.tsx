"use client";

import * as React from "react";
import Link from "next/link";
import { X, Lock } from "lucide-react";

const DISMISSED_KEY = "tdp:sticky-cta-dismissed";
const DISMISSED_EVENT = "tdp:sticky-cta-dismissed-changed";
let dismissedInMemory = false;

function getDismissedSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  if (dismissedInMemory) return true;
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function getDismissedServerSnapshot(): boolean {
  return false;
}

function subscribeToDismissal(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(DISMISSED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISMISSED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

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
  const dismissed = React.useSyncExternalStore(
    subscribeToDismissal,
    getDismissedSnapshot,
    getDismissedServerSnapshot
  );

  React.useEffect(() => {
    if (dismissed) return;

    let ticking = false;
    let animationFrame = 0;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      animationFrame = requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        const max = document.body.scrollHeight - window.innerHeight;
        const pct = max > 0 ? scrolled / max : 0;
        // Show after 50% scroll, hide in the last 15% (footer zone).
        setVisible(pct > 0.5 && pct < 0.85);
        ticking = false;
        animationFrame = 0;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [dismissed]);

  const dismiss = () => {
    setVisible(false);
    dismissedInMemory = true;
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(DISMISSED_EVENT));
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
