"use client";

import Link from "next/link";
import { PenLine, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Material Design 3 Floating Action Button (FAB).
 *
 * Standard FAB: 56×56dp, 16dp corner radius, primary color.
 * Positioned bottom-right, above the mobile bottom nav.
 * Hidden on desktop (md:hidden) where primary actions are in the header.
 */
export function FAB({
  href,
  icon: Icon = PenLine,
  label,
  className,
}: {
  href: string;
  icon?: LucideIcon;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "md3-fab fixed right-4 z-40 bg-stone-900 text-white dark:bg-white dark:text-stone-900 md:hidden",
        // Position above the mobile bottom nav (56px nav + 12px gap + safe area)
        label ? "bottom-20 px-5" : "bottom-20 w-14 px-0",
        className
      )}
      aria-label={label || "Action"}
    >
      <Icon className="h-5 w-5" />
      {label && <span className="text-sm">{label}</span>}
    </Link>
  );
}

export default FAB;
