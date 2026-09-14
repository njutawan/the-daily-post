"use client";

import * as React from "react";
import { Eye } from "lucide-react";

/**
 * Fetches and displays the view count for an article.
 */
export function ViewCount({ slug }: { slug: string }) {
  const [views, setViews] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/views/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok && typeof data.views === "number") {
          setViews(data.views);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          /* keep null on error — badge hidden */
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (views === null) return null;

  return (
    <span className="inline-flex items-center gap-1 font-sans text-[11px] text-stone-500 dark:text-stone-400">
      <Eye className="h-3 w-3" />
      <span className="tabular-nums">{views.toLocaleString()}</span>
      <span className="hidden sm:inline">{views === 1 ? "view" : "views"}</span>
    </span>
  );
}

export default ViewCount;
