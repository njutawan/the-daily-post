import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { NewsletterForm } from "@/components/NewsletterForm";
import { SubscriberCount } from "@/components/SubscriberCount";
import { ArrowLeft, Clock, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Newsletters — The Daily Post",
  description:
    "Sign up for The Daily Post's newsletters: The Morning, The Tech Brief, Climate Lab, and more. Delivered to your inbox.",
};

type Newsletter = {
  id: string;
  name: string;
  cadence: string;
  description: string;
  topics: string[];
  accent: string; // tailwind color class for the swatch
};

const newsletters: Newsletter[] = [
  {
    id: "the-morning",
    name: "The Morning",
    cadence: "Daily, 7 a.m.",
    description:
      "Your essential guide to the day — the biggest stories, the sharpest analysis, and what to watch for. In seven minutes or less.",
    topics: ["Top stories", "Politics", "What to watch"],
    accent: "bg-red-700",
  },
  {
    id: "the-tech-brief",
    name: "The Tech Brief",
    cadence: "Weekdays, 5 p.m.",
    description:
      "The companies, the code, and the consequences. A sharp, jargon-free look at the technology reshaping our world.",
    topics: ["AI", "Platforms", "Policy"],
    accent: "bg-stone-800",
  },
  {
    id: "climate-lab",
    name: "Climate Lab",
    cadence: "Tuesdays + Thursdays",
    description:
      "A planet in flux, explained. The science, the politics, and the solutions behind the defining story of our time.",
    topics: ["Science", "Policy", "Solutions"],
    accent: "bg-green-800",
  },
  {
    id: "the-7",
    name: "The 7",
    cadence: "Daily, 7 p.m.",
    description:
      "Seven of the day's most important stories, distilled into a quick evening read. No filler, just what matters.",
    topics: ["Top stories", "World", "Business"],
    accent: "bg-blue-900",
  },
  {
    id: "opinion-today",
    name: "Opinion Today",
    cadence: "Weekdays, noon",
    description:
      "Voices from across the spectrum. The best of our opinion pages, plus a guest essay you won't find anywhere else.",
    topics: ["Columns", "Guest essays", "Editorials"],
    accent: "bg-purple-900",
  },
  {
    id: "sports-afternoon",
    name: "Sports Afternoon",
    cadence: "Daily, 3 p.m.",
    description:
      "Scores, stakes, and the stories behind the games. From the locker room to the front office, all in one read.",
    topics: ["Scores", "Analysis", "Off-field"],
    accent: "bg-amber-700",
  },
];

export default function NewslettersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-headline text-4xl font-black leading-none text-black dark:text-white sm:text-6xl">
                  Newsletters
                </h1>
                <p className="mt-3 max-w-2xl font-body text-lg italic text-stone-600 dark:text-stone-400">
                  Sign up for the reporting that matters to you. Delivered to your inbox, from a newsroom you can trust.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <SubscriberCount />
                <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                  and counting
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter grid */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {newsletters.map((nl) => (
                <article
                  key={nl.id}
                  className="group flex flex-col border border-stone-300 bg-white transition-shadow hover:shadow-lg dark:border-stone-700 dark:bg-stone-950"
                >
                  {/* Swatch header */}
                  <div className={`${nl.accent} h-2 w-full`} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-headline text-2xl font-black text-black dark:text-white">
                        {nl.name}
                      </h3>
                      <span className="flex items-center gap-1 whitespace-nowrap font-sans text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        <Clock className="h-3 w-3" />
                        {nl.cadence}
                      </span>
                    </div>
                    <p className="mt-2 flex-1 font-body text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                      {nl.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {nl.topics.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-stone-300 px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:border-stone-700 dark:text-stone-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 border-t border-stone-200 pt-4 dark:border-stone-800">
                      <NewsletterForm
                        variant="compact"
                        placeholder="Your email"
                        buttonLabel="Subscribe"
                        source={`newsletter-${nl.id}`}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Why subscribe band */}
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[
                {
                  title: "No clickbait",
                  body: "We write the headline, you get the story. No manufactured outrage, no mystery-box teasers.",
                },
                {
                  title: "Expert editors",
                  body: "Every newsletter is assembled by editors who've covered these beats for decades — not an algorithm.",
                },
                {
                  title: "Unsubscribe anytime",
                  body: "One click and you're out. We make it easy to leave, which is why people stay.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 border-l-2 border-red-700 pl-4"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                  <div>
                    <h4 className="font-headline text-lg font-bold text-black dark:text-white">
                      {item.title}
                    </h4>
                    <p className="mt-1 font-sans text-sm text-stone-600 dark:text-stone-400">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
