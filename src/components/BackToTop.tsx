"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className={cn(
        "fixed right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-700 shadow-lg transition-all hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-white dark:hover:bg-white dark:hover:text-black",
        // Desktop: bottom-6; Mobile: above bottom nav (bottom-20)
        "bottom-20 lg:bottom-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export default BackToTop;
