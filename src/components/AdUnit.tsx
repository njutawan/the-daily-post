"use client";

import * as React from "react";
import { useUnifiedAuth } from "@/components/unified-auth-provider";
import { cn } from "@/lib/utils";
import { Megaphone, X } from "lucide-react";
import Link from "next/link";

type AdSize = "leaderboard" | "rectangle" | "halfpage" | "billboard" | "native";

type AdUnitProps = {
  size: AdSize;
  /** Unique slot ID for the ad network. */
  slotId: string;
  /** Optional label override. */
  label?: string;
  className?: string;
  /** If true, the ad stays sticky on scroll (sidebar). */
  sticky?: boolean;
  /** If true, the ad collapses when adblock is detected and shows a subscribe fallback. */
  showSubscribeFallback?: boolean;
};

const SIZE_DIMENSIONS: Record<AdSize, { width: string; height: string; maxWidth: string }> = {
  leaderboard: { width: "728", height: "90", maxWidth: "max-w-[728px]" },
  billboard: { width: "970", height: "250", maxWidth: "max-w-[970px]" },
  rectangle: { width: "300", height: "250", maxWidth: "max-w-[300px]" },
  halfpage: { width: "300", height: "600", maxWidth: "max-w-[300px]" },
  native: { width: "100%", height: "120", maxWidth: "max-w-full" },
};

/**
 * Ad placeholder component with:
 * - Lazy loading via IntersectionObserver (loads when scrolled into view)
 * - Adblock detection (collapses + shows subscribe fallback)
 * - Subscriber exclusion (hidden for logged-in subscribers)
 * - CLS prevention (reserved space with fixed dimensions)
 * - Dark mode aware
 *
 * To connect a real ad network (Google AdSense, etc.):
 * 1. Replace the placeholder div with the network's <ins> or <script> tag
 * 2. Use the `slotId` prop as the ad slot ID
 * 3. Keep the IntersectionObserver wrapper for lazy-loading
 */
export function AdUnit({
  size,
  slotId,
  label = "Advertisement",
  className,
  sticky = false,
  showSubscribeFallback = true,
}: AdUnitProps) {
  const { user } = useUnifiedAuth();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [adBlocked, setAdBlocked] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  // Hide for subscribers/admins — check AFTER all hooks are called.
  // A subscriber is any paid tier (digital / allaccess) or an admin.
  const isExcluded =
    user?.subTier === "digital" ||
    user?.subTier === "allaccess" ||
    user?.role === "admin";

  // Lazy load via IntersectionObserver
  React.useEffect(() => {
    if (isExcluded) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isExcluded]);

  // Adblock detection
  React.useEffect(() => {
    if (!shouldLoad || isExcluded) return;

    const bait = document.createElement("div");
    bait.className = "ad-banner ad-pla adsbox ad-unit google-ad";
    bait.style.cssText = "position:absolute;left:-9999px;top:-9999px;height:1px;width:1px;";
    document.body.appendChild(bait);

    const timer = setTimeout(() => {
      const isBlocked =
        bait.offsetParent === null ||
        bait.offsetHeight === 0 ||
        bait.clientHeight === 0 ||
        window.getComputedStyle(bait).display === "none" ||
        window.getComputedStyle(bait).visibility === "hidden";
      setAdBlocked(isBlocked);
      bait.remove();
    }, 100);

    return () => {
      clearTimeout(timer);
      bait.remove();
    };
  }, [shouldLoad, isExcluded]);

  if (isExcluded || dismissed) return null;

  const dims = SIZE_DIMENSIONS[size];

  // Adblock detected → show subscribe fallback (or collapse)
  if (adBlocked && showSubscribeFallback) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative mx-auto flex flex-col items-center justify-center border border-stone-200 bg-stone-50 p-4 text-center dark:border-stone-800 dark:bg-stone-900",
          dims.maxWidth,
          "min-h-[120px]",
          className
        )}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <Megaphone className="h-6 w-6 text-stone-400" />
        <p className="mt-2 font-sans text-xs font-semibold text-stone-600 dark:text-stone-400">
          Enjoy ad-free reading
        </p>
        <p className="mt-1 font-body text-sm italic text-stone-500 dark:text-stone-500">
          Support independent journalism.
        </p>
        <Link
          href="/newsletters"
          className="mt-2 rounded-sm bg-black px-4 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:bg-stone-800 dark:bg-white dark:text-black"
        >
          Subscribe →
        </Link>
      </div>
    );
  }

  if (adBlocked && !showSubscribeFallback) {
    return null; // collapse silently
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto",
        sticky && "sticky top-24",
        dims.maxWidth,
        className
      )}
    >
      {shouldLoad ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center overflow-hidden border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900",
            "min-h-[60px]"
          )}
          style={{ minHeight: `${dims.height}px` }}
          data-ad-slot={slotId}
          data-ad-size={size}
        >
          {/* Placeholder — replace with real ad network code */}
          <div className="flex flex-col items-center gap-1 py-4">
            <Megaphone className="h-5 w-5 text-stone-300 dark:text-stone-700" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-stone-300 dark:text-stone-700">
              {label}
            </span>
            <span className="font-sans text-[10px] text-stone-300 dark:text-stone-700">
              {dims.width} × {dims.height}
            </span>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center border border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-900",
            "min-h-[60px]"
          )}
          style={{ minHeight: `${dims.height}px` }}
        >
          <span className="font-sans text-[10px] text-stone-200 dark:text-stone-800">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

export default AdUnit;
