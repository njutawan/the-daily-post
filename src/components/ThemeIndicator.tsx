"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Sun, Moon } from "lucide-react";

/**
 * Shows the current theme mode (light / dark / system) in the footer.
 * Helps users understand which mode is active.
 */
export function ThemeIndicator() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className="inline-flex items-center gap-1 font-sans text-[11px] text-stone-500 dark:text-stone-400">
        <Monitor className="h-3 w-3" />
        Theme
      </span>
    );
  }

  const mode = (theme as string) || "light";
  const resolved = resolvedTheme === "dark" ? "dark" : "light";

  const Icon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const label =
    mode === "system"
      ? `System · ${resolved}`
      : mode === "dark"
        ? "Dark"
        : "Light";

  return (
    <span className="inline-flex items-center gap-1 font-sans text-[11px] text-stone-500 dark:text-stone-400">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default ThemeIndicator;
