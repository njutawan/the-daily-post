"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Heading = {
  level: number;
  text: string;
  id: string;
};

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      }
    );

    // Observe all heading elements in the article body
    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="hidden xl:block" aria-label="Table of contents">
      <div className="sticky top-28">
        <h3 className="mb-3 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          In this article
        </h3>
        <ol className="space-y-1.5 border-l border-stone-200 dark:border-stone-800">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block border-l-2 py-0.5 font-sans text-xs transition-colors",
                  heading.level === 3 ? "pl-6" : "pl-3",
                  activeId === heading.id
                    ? "border-l-2 border-red-700 font-semibold text-black dark:text-white"
                    : "border-l-2 border-transparent text-stone-500 hover:text-black dark:text-stone-400 dark:hover:text-white"
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

export default TableOfContents;
