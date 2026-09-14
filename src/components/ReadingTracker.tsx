"use client";

import * as React from "react";

/**
 * Tracks scroll depth (max % reached) and time on page, then POSTs the
 * reading session to /api/reading/[slug] on page unload / visibility change.
 */
export function ReadingTracker({ slug }: { slug: string }) {
  const maxScroll = React.useRef(0);
  const startTime = React.useRef(Date.now());
  const submitted = React.useRef(false);

  React.useEffect(() => {
    startTime.current = Date.now();
    maxScroll.current = 0;
    submitted.current = false;

    function updateScrollDepth() {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      const pct = height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0;
      if (pct > maxScroll.current) maxScroll.current = pct;
    }

    function submit() {
      if (submitted.current) return;
      submitted.current = true;
      const timeOnPage = Math.round((Date.now() - startTime.current) / 1000);
      const scrollDepth = Math.round(maxScroll.current);
      // Only record meaningful sessions (>3s or >5% scroll)
      if (timeOnPage < 3 && scrollDepth < 5) return;
      const payload = JSON.stringify({ scrollDepth, timeOnPage });
      // Use sendBeacon for reliability on unload; fallback to fetch
      if (navigator.sendBeacon) {
        navigator.sendBeacon(`/api/reading/${slug}`, payload);
      } else {
        fetch(`/api/reading/${slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    }

    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    window.addEventListener("beforeunload", submit);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") submit();
    });

    return () => {
      submit();
      window.removeEventListener("scroll", updateScrollDepth);
      window.removeEventListener("beforeunload", submit);
    };
  }, [slug]);

  return null;
}

export default ReadingTracker;
