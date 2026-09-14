"use client";

import * as React from "react";
import { Users } from "lucide-react";

export function SubscriberCount() {
  const [count, setCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/subscribe")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok && typeof data.count === "number") {
          setCount(data.count);
        }
      })
      .catch(() => {
        /* fail silently — badge is non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-2.5 py-1 font-sans text-[11px] font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-400">
      <Users className="h-3 w-3" />
      <span className="tabular-nums">{count.toLocaleString()}</span>
      <span className="text-stone-500 dark:text-stone-500">subscribers</span>
    </span>
  );
}

export default SubscriberCount;
