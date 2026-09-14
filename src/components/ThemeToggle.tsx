"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const current: ThemeMode = (theme as ThemeMode) || "light";
  const isDark = resolvedTheme === "dark";

  function cycle() {
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length];
    setTheme(next);
  }

  const label =
    current === "system"
      ? `System (currently ${isDark ? "dark" : "light"})`
      : current === "dark"
        ? "Dark mode"
        : "Light mode";

  const Icon = current === "system" ? Monitor : isDark ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={`Theme: ${label}. Click to change.`}
      title={label}
      onClick={cycle}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border text-stone-700 transition dark:text-stone-300",
        "border-stone-300 hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
      )}
    >
      {mounted ? (
        <Icon className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4 opacity-0" />
      )}
    </button>
  );
}

export default ThemeToggle;
