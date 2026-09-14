import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, BookOpen, Check, Users, Zap, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleCard } from "@/components/ArticleCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { PopularThisWeek } from "@/components/PopularThisWeek";
import { SubscriberCount } from "@/components/SubscriberCount";
import { TrendingTopics } from "@/components/TrendingTopics";
import { AdUnit } from "@/components/AdUnit";
import { runStartupTasks } from "@/lib/startup";
import {
  leadArticle,
  trendingStories,
  opinionPieces,
  worldStories,
  moreNews,
} from "@/data/articles";
import { ArrowRight, ChevronRight, Flame, TrendingUp, Mail } from "lucide-react";

export default async function Home() {
  // Run one-time startup tasks (data retention, cache cleanup)
  runStartupTasks();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* ===== HERO SECTION (12-col grid) ===== */}
        <section className="border-b border-stone-200">
          <div className="mx-auto max-w-[1400px] px-4 py-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-12">
              {/* Lead story: 8 columns */}
              <div className="lg:col-span-8 lg:border-r lg:border-stone-300 lg:pr-8">
                <SectionLabel label="Top Story" />
                <ArticleCard article={leadArticle} layout="hero" />

                {/* Live updates strip */}
                <div className="mt-6 border-t border-stone-200 pt-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-700 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-700" />
                    </span>
                    Live Updates · Infrastructure Bill
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      "House progressives signal they will demand the climate package move alongside the bill",
                      "President Reeves to address the nation at 10 a.m. Wednesday from the Rose Garden",
                      "Treasury officials say first infrastructure dollars could flow within 60 days",
                    ].map((t, i) => (
                      <li key={i} className="flex items-start gap-3 font-body text-[15px] leading-relaxed text-stone-700 hover:text-black transition-colors cursor-pointer">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-700" />
                        <span className="flex-1">{t}</span>
                        <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-stone-400" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Trending sidebar: 4 columns */}
              <aside className="lg:col-span-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <SectionLabel label="Most Read" icon={<Flame className="h-3.5 w-3.5" />} />
                  <Link href="/most-read" className="font-sans text-[11px] font-semibold uppercase tracking-wider text-stone-500 hover:text-black">
                    See all
                  </Link>
                </div>
                <ol className="divide-y divide-stone-300">
                  {trendingStories.map((article, i) => (
                    <li key={article.slug} className="py-3.5">
                      <ArticleCard
                        article={article}
                        layout="compact"
                        index={i + 1}
                        showImage={false}
                      />
                    </li>
                  ))}
                </ol>

                {/* Newsletter promo */}
                <div className="mt-6 border border-stone-300 bg-stone-50 p-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <Mail className="h-4 w-4" />
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wider">
                      The Morning
                    </span>
                  </div>
                  <h4 className="mt-2 font-headline text-lg font-bold text-black">
                    Your essential guide to the day, every morning.
                  </h4>
                  <p className="mt-1 font-sans text-xs text-stone-600">
                    The biggest stories of the day, in seven minutes or less.
                  </p>
                  <NewsletterForm variant="compact" placeholder="Email" buttonLabel="Sign Up" source="sidebar" />
                </div>

                {/* Sidebar Sticky Ad (300×600) */}
                <div className="mt-6 hidden lg:block">
                  <AdUnit
                    size="halfpage"
                    slotId="home-sidebar-sticky"
                    label="Advertisement"
                    sticky
                  />
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ===== OPINION & ANALYSIS ===== */}
        <section id="opinions" className="border-b border-stone-200 bg-stone-50">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            <div className="flex items-end justify-between border-b-2 border-black pb-3">
              <div>
                <h2 className="font-headline text-3xl font-black text-black">Opinion &amp; Analysis</h2>
                <p className="mt-1 font-sans text-sm text-stone-600">
                  Voices from across the political spectrum, every weekday.
                </p>
              </div>
              <Link
                href="#opinions"
                className="hidden items-center gap-1 font-sans text-xs font-bold uppercase tracking-wider text-stone-700 hover:text-black sm:flex"
              >
                All Opinions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-stone-300">
              {opinionPieces.map((piece, i) => (
                <div key={piece.slug} className={i > 0 ? "lg:pl-6" : ""}>
                  <ArticleCard article={piece} layout="opinion" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== MID-HOMEPAGE AD (300×250) — desktop only ===== */}
        <div className="hidden border-b border-stone-200 py-6 dark:border-stone-800 lg:block">
          <div className="mx-auto max-w-[1400px] px-4">
            <AdUnit size="rectangle" slotId="home-mid-rectangle" label="Advertisement" />
          </div>
        </div>

        {/* ===== WORLD / TECH / BUSINESS ===== */}
        <section id="world" className="border-b border-stone-200">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            <div className="flex items-end justify-between border-b-2 border-black pb-3">
              <h2 className="font-headline text-3xl font-black text-black">From the World Desk</h2>
              <Link
                href="#world"
                className="hidden items-center gap-1 font-sans text-xs font-bold uppercase tracking-wider text-stone-700 hover:text-black sm:flex"
              >
                More World <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
              {worldStories.map((article) => (
                <ArticleCard key={article.slug} article={article} layout="standard" />
              ))}
            </div>
          </div>
        </section>

        {/* ===== MORE HEADLINES (two-column with rules) ===== */}
        <section className="border-b border-stone-200">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            <div className="flex items-end justify-between border-b-2 border-black pb-3">
              <h2 className="font-headline text-3xl font-black text-black">More Headlines</h2>
              <span className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-stone-500">
                <TrendingUp className="h-3.5 w-3.5" /> Updated minutes ago
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
              {moreNews.map((article, i) => (
                <div
                  key={article.slug}
                  className={
                    i % 4 !== 0
                      ? "border-t border-stone-200 pt-6 sm:border-t-0 sm:border-l sm:border-stone-300 sm:pl-6 sm:pt-0 dark:border-stone-700 dark:border-t dark:sm:border-l"
                      : "border-t border-stone-200 pt-6 sm:border-t-0 sm:pt-0 dark:border-t dark:border-stone-700"
                  }
                >
                  <ArticleCard article={article} layout="standard" showSummary={false} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== POPULAR THIS WEEK (data-driven) ===== */}
        <PopularThisWeek />

        {/* ===== TRENDING TOPICS (data-driven) ===== */}
        <TrendingTopics />

        {/* ===== TODAY'S FRONT PAGE (newspaper multi-column) ===== */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            <div className="flex items-end justify-between border-b-2 border-black pb-3 dark:border-white">
              <div>
                <h2 className="font-headline text-3xl font-black text-black dark:text-white">
                  Today&rsquo;s Front Page
                </h2>
                <p className="mt-1 font-sans text-sm text-stone-600 dark:text-stone-400">
                  A newspaper-style digest of the day&rsquo;s reporting, in the order we&rsquo;d print it.
                </p>
              </div>
              <span className="hidden font-logo text-2xl text-stone-400 dark:text-stone-600 sm:block">
                Vol. CXLII · No. 252
              </span>
            </div>

            {/* Multi-column newspaper layout */}
            <div className="mt-6 grid grid-cols-1 gap-x-8 md:grid-cols-3">
              {/* Column 1 — featured */}
              <div className="border-b border-stone-200 pb-6 md:border-b-0 md:border-r md:border-stone-300 md:pb-0 md:pr-8 dark:border-stone-700">
                <ArticleCard article={leadArticle} layout="standard" showSummary={true} />
              </div>
              {/* Column 2 — middle */}
              <div className="border-b border-stone-200 py-6 md:border-b-0 md:border-r md:border-stone-300 md:px-8 dark:border-stone-700">
                {worldStories.slice(0, 2).map((a) => (
                  <div key={a.slug} className="mb-5 last:mb-0">
                    <ArticleCard article={a} layout="standard" showSummary={false} />
                  </div>
                ))}
              </div>
              {/* Column 3 — briefs */}
              <div className="pt-6 md:pl-8">
                <h3 className="mb-3 border-b border-stone-300 pb-1 font-sans text-[11px] font-bold uppercase tracking-wider text-red-700 dark:border-stone-700">
                  In Brief
                </h3>
                <ol className="space-y-4">
                  {[...moreNews.slice(2), ...worldStories.slice(2)].slice(0, 5).map((a, i) => (
                    <li key={a.slug} className="flex gap-3 border-b border-stone-100 pb-3 last:border-b-0 last:pb-0 dark:border-stone-800">
                      <span className="font-headline text-2xl font-black leading-none text-stone-300 dark:text-stone-700">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <Link
                          href={`/article/${a.slug}`}
                          className="font-headline text-base font-bold leading-snug text-black dark:text-white"
                        >
                          <span className="headline-link decoration-stone-900 dark:decoration-white">{a.title}</span>
                        </Link>
                        <p className="mt-1 font-sans text-[11px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          {a.category} · {a.time}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FEATURED VISUAL / Full-bleed immersive ===== */}
        <section className="relative bg-black text-white">
          {/* Full-bleed background image */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={worldStories[0].imageUrl}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
          </div>

          {/* Content overlay */}
          <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-16 sm:py-24">
            <div className="max-w-2xl">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-red-500">
                On the Ground
              </span>
              <h2 className="mt-3 font-headline text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                A reporter&rsquo;s notebook from the Eastern front, where the war has settled into a long winter
              </h2>
              <p className="mt-4 font-body text-lg leading-relaxed text-stone-300">
                Three years in, the soldiers here no longer speak of breakthroughs. They speak of the cold, the rotations, and the quiet arithmetic of a war that has stopped moving.
              </p>
              <Link
                href={`/article/${worldStories[0].slug}`}
                className="mt-6 inline-flex items-center gap-2 border-b-2 border-white pb-1 font-sans text-sm font-bold uppercase tracking-wider transition-all hover:gap-3"
              >
                Read the full report <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Membership section — conversion-focused with social proof + benefits */}
        <section className="border-y border-stone-200 bg-gradient-to-b from-stone-50 to-white dark:border-stone-800 dark:from-stone-950 dark:to-stone-900">
          <div className="mx-auto max-w-[1400px] px-4 py-16 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              {/* Social proof badge */}
              <div className="flex items-center justify-center gap-2 text-stone-500 dark:text-stone-400">
                <Users className="h-4 w-4" />
                <SubscriberCount /> readers already subscribed
              </div>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                <Zap className="h-3 w-3" />
                Limited time: First month free
              </div>

              <h2 className="mt-4 font-headline text-4xl font-black text-stone-900 sm:text-5xl dark:text-stone-50">
                Read without limits.
              </h2>
              <p className="mt-4 mx-auto max-w-2xl font-body text-lg leading-relaxed text-stone-600 dark:text-stone-400">
                Unlimited articles, ad-free reading, AI-narrated audio, and exclusive investigations. Support independent journalism that holds power accountable.
              </p>
            </div>

            {/* Benefit grid */}
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: BookOpen, title: "Unlimited articles", desc: "No metered paywall" },
                { icon: Check, title: "Ad-free reading", desc: "Zero distractions" },
                { icon: Clock, title: "AI audio narration", desc: "Listen on the go" },
                { icon: ShieldCheck, title: "Exclusive investigations", desc: "Premium content" },
              ].map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                      <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-sans text-sm font-bold text-stone-900 dark:text-stone-50">{benefit.title}</div>
                      <div className="font-sans text-xs text-stone-500 dark:text-stone-400">{benefit.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA row */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/subscribe"
                className="inline-flex items-center gap-2 rounded-md bg-stone-900 px-8 py-3.5 font-sans text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-200"
              >
                Start your membership
                <ArrowRight className="h-4 w-4" />
              </Link>
              <div className="font-sans text-sm text-stone-500 dark:text-stone-400">
                From <span className="font-bold text-stone-700 dark:text-stone-300">$4.99/mo</span> · Cancel anytime
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function WorkspaceCard({
  href,
  icon: Icon,
  accent,
  label,
  description,
  cta,
}: {
  href: string;
  icon: typeof ShieldCheck;
  accent: string;
  label: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-stone-200 bg-white p-6 transition-all hover:border-stone-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-100 dark:bg-stone-800">
          <Icon className={`h-5 w-5 ${accent}`} strokeWidth={2.2} />
        </div>
        <div className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
          {label}
        </div>
      </div>
      <p className="mt-4 flex-1 font-body text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        {description}
      </p>
      <div className={`mt-5 flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-[0.18em] ${accent}`}>
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function SectionLabel({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-red-700">
      {icon}
      {label}
    </div>
  );
}
