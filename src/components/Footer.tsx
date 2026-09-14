import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube, Rss, Linkedin } from "lucide-react";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SubscriberCount } from "@/components/SubscriberCount";
import { ThemeIndicator } from "@/components/ThemeIndicator";

type FooterLink = {
  label: string;
  href: string;
};

const footerSections: { title: string; links: FooterLink[] }[] = [
  {
    title: "Sections",
    links: [
      { label: "Politics", href: "/category/politics" },
      { label: "Opinions", href: "/category/opinions" },
      { label: "World", href: "/category/world" },
      { label: "Tech", href: "/category/tech" },
      { label: "Business", href: "/category/business" },
      { label: "Climate", href: "/category/climate" },
      { label: "Sports", href: "/category/sports" },
      { label: "Live", href: "/live" },
      { label: "Most Read", href: "/most-read" },
    ],
  },
  {
    title: "Newsroom",
    links: [
      { label: "Newsletters", href: "/newsletters" },
      { label: "Most Read", href: "/most-read" },
      { label: "Live Coverage", href: "/live" },
    ],
  },
  {
    title: "Subscriber",
    links: [
      { label: "Subscribe", href: "/subscribe" },
      { label: "Sign In", href: "/member" },
      { label: "Saved Articles", href: "/saved" },
    ],
  },
  {
    title: "Discover",
    links: [
      { label: "Search", href: "/search" },
      { label: "Most Read", href: "/most-read" },
      { label: "Live Blog", href: "/live" },
      { label: "RSS Feed", href: "/feed.xml" },
      { label: "Sitemap", href: "/sitemap.xml" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Contact Us", href: "/about#contact" },
      { label: "Corrections", href: "/about#corrections" },
      { label: "Ethics Policy", href: "/about#ethics" },
      { label: "Accessibility", href: "/about#accessibility" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Use", href: "/about#terms" },
      { label: "Privacy Policy", href: "/about#privacy" },
      { label: "Cookie Policy", href: "/about#cookies" },
      { label: "Ad Choices", href: "/about#ad-choices" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
      {/* Top newsletter band */}
      <div className="border-b border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-950">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 px-4 py-8 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="font-headline text-2xl font-bold text-black dark:text-white">
                The Daily Post, in your inbox
              </h3>
              <p className="mt-1 font-sans text-sm text-stone-600 dark:text-stone-400">
                Sign up for our flagship newsletter and never miss a story that matters.
              </p>
            </div>
            <SubscriberCount />
          </div>
          <NewsletterForm variant="band" source="footer" />
        </div>
      </div>

      {/* Main footer grid */}
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="font-logo text-3xl leading-none text-black dark:text-white">
              The Daily Post
            </Link>
            <p className="mt-3 max-w-xs font-sans text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              Independent reporting on the forces shaping our world — from the halls of power to the front lines of a changing climate.
            </p>
            <div className="mt-4 flex gap-2">
              {[Facebook, Twitter, Instagram, Youtube, Linkedin, Rss].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 transition hover:border-black hover:bg-black hover:text-white dark:border-stone-700 dark:text-stone-400 dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
                  aria-label="Social link"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="border-b border-stone-300 pb-2 font-sans text-xs font-bold uppercase tracking-wider text-black dark:border-stone-700 dark:text-white">
                {section.title}
              </h4>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-sans text-[13px] text-stone-600 transition-colors hover:text-black hover:underline dark:text-stone-400 dark:hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-300 dark:border-stone-700">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-4 text-center md:flex-row md:text-left">
          <p className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
            © {new Date().getFullYear()} The Daily Post Media Company. All rights reserved.
          </p>
          <p className="font-sans text-[11px] italic text-stone-500 dark:text-stone-400">
            Democracy Dies in Darkness
          </p>
          <div className="flex gap-4 font-sans text-[11px] text-stone-500 dark:text-stone-400">
            <Link href="/feed.xml" className="flex items-center gap-1 hover:text-black dark:hover:text-white">
              <Rss className="h-3 w-3" />
              RSS
            </Link>
            <Link href="/sitemap.xml" className="hover:text-black dark:hover:text-white">Sitemap</Link>
            <Link href="/subscribe" className="font-bold hover:text-black dark:hover:text-white">Subscribe</Link>
            <Link href="/most-read" className="flex items-center gap-1 hover:text-black dark:hover:text-white">
              Most Read
            </Link>
          </div>
          <ThemeIndicator />
        </div>
      </div>
    </footer>
  );
}

export default Footer;
