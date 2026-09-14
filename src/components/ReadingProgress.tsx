"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function ReadingProgress() {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      const pct = height > 0 ? Math.min(100, Math.max(0, (scrollTop / height) * 100)) : 0;
      setProgress(pct);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const pct = Math.round(progress);
  const showLabel = progress > 3 && progress < 99;

  return (
    <div
      className="fixed left-0 top-0 z-[80] h-1 w-full bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-red-700 transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
      {showLabel && (
        <div
          className={cn(
            "absolute right-4 top-1.5 flex items-center gap-1 rounded-full bg-black/90 px-2 py-0.5",
            "font-sans text-[10px] font-bold tabular-nums text-white",
            "transition-opacity duration-200"
          )}
        >
          {pct}% read
        </div>
      )}
    </div>
  );
}

export default ReadingProgress;
