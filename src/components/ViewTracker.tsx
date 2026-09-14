"use client";

import * as React from "react";

/**
 * Fires a POST to /api/views/[slug] once on mount to record an article view.
 * Renders nothing visible. Dedupes per-session via sessionStorage so refreshes
 * within the same session don't double-count.
 */
export function ViewTracker({ slug }: { slug: string }) {
  React.useEffect(() => {
    const SESSION_KEY = `tdp:viewed:${slug}`;
    if (typeof window === "undefined") return;
    // Only record once per session
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    fetch(`/api/views/${slug}`, { method: "POST" }).catch(() => {
      /* fail silently — view tracking is non-critical */
    });
  }, [slug]);

  return null;
}

export default ViewTracker;
