"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * MobileBottomNav — Material Design 3 Navigation Bar.
 *
 * MD3 specs implemented:
 *   • Active indicator: pill-shaped background behind the active item
 *   • Touch targets: 48dp minimum (MD3 accessibility requirement)
 *   • Tonal elevation: surface color at higher tint level
 *   • Icon + label: both colored when active, neutral when inactive
 *   • Safe area: respects env(safe-area-inset-bottom) for edge-to-edge
 *   • GPU acceleration: translateZ(0) prevents iOS Safari hide-on-scroll
 */
type MobileBottomNavProps = {
  onOpenSearch: () => void;
};

export function MobileBottomNav({ onOpenSearch }: MobileBottomNavProps) {
  const pathname = usePathname();

  const items = [
    {
      label: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Account",
      icon: User,
      href: "/member",
      active: pathname === "/member" || pathname.startsWith("/member/"),
    },
    {
      label: "Search",
      icon: Search,
      action: onOpenSearch,
      active: false,
    },
    {
      label: "Saved",
      icon: Bookmark,
      href: "/saved",
      active: pathname === "/saved",
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-stone-200 bg-white/95 backdrop-blur-md px-2 pt-2 pb-1 shadow-[0_-1px_3px_rgba(0,0,0,0.12),0_-2px_8px_rgba(0,0,0,0.08)] dark:border-stone-800 dark:bg-stone-950/95 md:hidden"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 4px)",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
      aria-label="Mobile bottom navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        if (item.action) {
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="group flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1"
              aria-label={item.label}
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  "text-stone-600 dark:text-stone-400 group-active:text-stone-900 dark:group-active:text-stone-100"
                )}
              />
              <span className="font-sans text-[11px] font-medium text-stone-600 dark:text-stone-400">
                {item.label}
              </span>
            </button>
          );
        }
        return (
          <Link
            key={item.label}
            href={item.href!}
            className="group relative flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1"
          >
            {/* MD3 Active indicator — pill shape behind icon */}
            {item.active && (
              <span
                className="absolute top-1 h-8 w-[64px] rounded-full bg-red-700/12 transition-all duration-200 dark:bg-red-500/15"
                aria-hidden="true"
              />
            )}
            <Icon
              className={cn(
                "relative h-6 w-6 transition-colors",
                item.active
                  ? "text-red-700 dark:text-red-400"
                  : "text-stone-600 dark:text-stone-400 group-active:text-stone-900 dark:group-active:text-stone-100"
              )}
            />
            <span
              className={cn(
                "relative font-sans text-[11px] font-medium transition-colors",
                item.active
                  ? "text-red-700 dark:text-red-400"
                  : "text-stone-600 dark:text-stone-400"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
