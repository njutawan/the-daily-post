"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search, X, ChevronDown, Globe, Bookmark as BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SearchCommand } from "@/components/SearchCommand";
import { WorkspaceMenu } from "@/components/WorkspaceMenu";
import { WeatherWidget } from "@/components/WeatherWidget";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { categories } from "@/data/articles";

const navItems = [
  {
    label: "Politics",
    href: "/category/politics",
    subSections: ["Congress", "The White House", "Elections", "Investigations"],
  },
  {
    label: "Opinions",
    href: "/category/opinions",
    subSections: ["Editorials", "Columnists", "Letters", "Cartoons"],
  },
  {
    label: "World",
    href: "/category/world",
    subSections: ["Europe", "Asia", "Africa", "Americas"],
  },
  {
    label: "Tech",
    href: "/category/tech",
    subSections: ["AI & Machine Learning", "Cybersecurity", "Startups", "Policy"],
  },
  {
    label: "Business",
    href: "/category/business",
    subSections: ["Markets", "Economy", "Real Estate", "Tech Companies"],
  },
  {
    label: "Climate",
    href: "/category/climate",
    subSections: ["Energy", "Environment", "Science", "Solutions"],
  },
  {
    label: "Sports",
    href: "/category/sports",
    subSections: ["Football", "Basketball", "Baseball", "Olympics"],
  },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Header() {
  const [now, setNow] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Set client-only date after mount to avoid hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(formatDate(new Date()));

    const onScroll = () => setScrolled(window.scrollY > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-stone-950">
      {/* Breaking news ticker — hidden when scrolled */}
      <div className={cn("bg-black text-white text-xs transition-all duration-300 overflow-hidden", scrolled ? "max-h-0 opacity-0" : "max-h-20 opacity-100")}>
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-1.5">
          <span className="flex items-center gap-1.5 bg-red-700 px-2 py-0.5 font-sans font-bold uppercase tracking-wider">
            <span className="relative flex h-1.5 w-1.2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            Live
          </span>
          <div className="ticker-wrap relative flex-1 overflow-hidden">
            <div className="animate-ticker flex whitespace-nowrap font-sans">
              <span className="px-6">
                Senate passes $1.2T infrastructure bill 68-32 &nbsp;·&nbsp; Hurricane Marlow strengthens to Category 4 &nbsp;·&nbsp; Fed holds rates steady; markets hit record &nbsp;·&nbsp; Supreme Court weighs encryption privacy case &nbsp;·&nbsp;
              </span>
              <span className="px-6" aria-hidden>
                Senate passes $1.2T infrastructure bill 68-32 &nbsp;·&nbsp; Hurricane Marlow strengthens to Category 4 &nbsp;·&nbsp; Fed holds rates steady; markets hit record &nbsp;·&nbsp; Supreme Court weighs encryption privacy case &nbsp;·&nbsp;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top utility bar — hidden on mobile to save space */}
      <div className="hidden border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950 sm:block">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-2 text-[11px] font-sans text-stone-600 dark:text-stone-400">
          <div>{now}</div>
          <div className="mx-auto flex items-center gap-1.5 italic text-stone-700 dark:text-stone-300">
            <span className="hidden text-stone-400 md:inline">“</span>
            Democracy Dies in Darkness
            <span className="hidden text-stone-400 md:inline">”</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <WeatherWidget />
            <span className="hidden text-stone-300 dark:text-stone-700 sm:inline">|</span>
            <button
              className="hidden items-center gap-1 hover:text-black dark:hover:text-white md:flex"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="font-medium">Search</span>
            </button>
            <span className="hidden text-stone-300 dark:text-stone-700 sm:inline">|</span>
            <ThemeToggle />
            <span className="hidden text-stone-300 dark:text-stone-700 sm:inline">|</span>
            <WorkspaceMenu />
          </div>
        </div>
      </div>

      {/* Masthead / Logo — collapses when scrolled on DESKTOP only.
          On mobile & tablet, the masthead ALWAYS stays visible so users
          always see the brand + hamburger menu while scrolling. */}
      <div className={cn(
        "border-b border-stone-200 bg-white transition-all duration-300 overflow-hidden dark:border-stone-800 dark:bg-stone-950",
        scrolled
          ? "lg:max-h-0 lg:opacity-0 lg:border-b-0 max-h-32 opacity-100"
          : "max-h-32 opacity-100"
      )}>
        {/* When scrolled on mobile/tablet, shrink the padding so the
            sticky masthead takes less vertical space. */}
        <div className={cn("mx-auto flex max-w-[1400px] items-center justify-between px-4 transition-all duration-300", scrolled ? "py-1 sm:py-1.5" : "py-2 sm:py-3")}>
          {/* Left spacer / mobile menu */}
          <div className="flex w-24 items-center gap-2 sm:w-32">
            <button
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link
              href="/"
              className="hidden items-center gap-1 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white lg:flex"
            >
              <Globe className="h-3.5 w-3.5" />
              English
              <ChevronDown className="h-3 w-3" />
            </Link>
            {/* Mobile: weather + date inline */}
            <span className="flex items-center gap-2 sm:hidden">
              <WeatherWidget />
              <span className="text-[10px] text-stone-500">{now}</span>
            </span>
          </div>

          {/* Center logo — compact on mobile; shrinks slightly when
              scrolled on mobile/tablet so the sticky masthead takes
              less vertical space while staying visible. */}
          <Link
            href="/"
            className={cn(
              "font-logo leading-none text-black dark:text-white transition-all duration-300",
              scrolled
                ? "text-xl sm:text-3xl md:text-4xl lg:hidden"
                : "text-2xl sm:text-5xl md:text-6xl lg:text-7xl"
            )}
            aria-label="The Daily Post — Home"
          >
            The Daily Post
          </Link>

          {/* Right actions — single Subscribe on desktop, nothing on mobile (bottom nav handles it) */}
          <div className="flex w-24 items-center justify-end gap-2 sm:w-32">
            <button
              className="hidden text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white lg:block"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search className="h-4 w-4" />
            </button>
            <Button
              asChild
              className="hidden h-7 rounded-none border border-black bg-white text-[11px] font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white lg:flex dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white dark:hover:text-black"
            >
              <Link href="/subscribe">Subscribe</Link>
            </Button>
            {/* Mobile: theme toggle inline */}
            <span className="sm:hidden">
              <ThemeToggle />
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-b-2 border-black bg-white dark:border-white dark:bg-stone-950">
        <div className="mx-auto hidden max-w-[1400px] items-center lg:flex">
          {navItems.map((item) => (
            <div key={item.label} className="group relative">
              <Link
                href={item.href}
                className="flex items-center gap-0.5 px-5 py-3 font-sans text-[13px] font-bold uppercase tracking-wider text-stone-800 transition-colors hover:text-black dark:text-stone-200 dark:hover:text-white"
              >
                {item.label}
                <ChevronDown className="h-3 w-3 opacity-50 transition-transform group-hover:rotate-180" />
                <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-black transition-transform duration-200 group-hover:scale-x-100 dark:bg-white" />
              </Link>
              {/* Mega menu dropdown */}
              {item.subSections && (
                <div className="absolute left-0 top-full z-50 hidden min-w-[200px] border border-stone-200 bg-white shadow-xl group-hover:block dark:border-stone-700 dark:bg-stone-950">
                  <div className="py-2">
                    {item.subSections.map((sub) => (
                      <Link
                        key={sub}
                        href={`${item.href}`}
                        className="block px-4 py-2 font-sans text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-black dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-white"
                      >
                        {sub}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <Link
            href="/live"
            className="group relative flex items-center px-5 py-3 font-sans text-[13px] font-bold uppercase tracking-wider text-red-700 transition-colors hover:text-red-800"
          >
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-700 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-700" />
              </span>
              Live
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-4 px-4">
            <Link href="/saved" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white">
              <BookmarkIcon className="h-3.5 w-3.5" />
              Saved
            </Link>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <Link href="/newsletters" className="text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white">
              Newsletters
            </Link>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <button className="text-xs font-semibold uppercase tracking-wider text-stone-700 hover:text-black dark:text-stone-300 dark:hover:text-white">
              Podcasts
            </button>
          </div>
        </div>

        {/* Mobile sub-nav horizontal scroll */}
        <div className="overflow-x-auto border-t border-stone-200 dark:border-stone-800 lg:hidden">
          <div className="flex gap-5 px-4 py-2.5 whitespace-nowrap">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-sans text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/most-read"
              className="font-sans text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              Most Read
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile menu sheet */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-white shadow-xl dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <span className="font-logo text-2xl text-black dark:text-white">The Daily Post</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="dark:text-stone-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col">
              {categories.map((c) => (
                <Link
                  key={c}
                  href={c === "Live" ? "/live" : `/category/${c.toLowerCase()}`}
                  onClick={() => setOpen(false)}
                  className="border-b border-stone-100 px-4 py-3 font-sans text-sm font-bold uppercase tracking-wider text-stone-800 hover:bg-stone-50 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {c}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Link
                href="/saved"
                onClick={() => setOpen(false)}
                className="flex h-9 items-center gap-2 rounded-none border border-stone-300 px-3 font-sans text-xs font-bold uppercase tracking-wider text-stone-800 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                <BookmarkIcon className="h-4 w-4" />
                Saved articles
              </Link>
              <Button className="h-9 rounded-none bg-black text-xs font-bold uppercase tracking-wider dark:bg-white dark:text-black">
                Subscribe
              </Button>
              <Button variant="outline" className="h-9 rounded-none text-xs font-bold uppercase tracking-wider">
                Sign in
              </Button>
            </div>
          </div>
        </div>
      )}

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileBottomNav
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSections={() => setOpen(true)}
      />
    </header>
  );
}

export default Header;
