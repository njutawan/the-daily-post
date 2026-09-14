import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SubscriberCount } from "@/components/SubscriberCount";
import { Check, ArrowLeft, Zap, Crown, BookOpen, ShieldCheck, Lock, CreditCard } from "lucide-react";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Subscribe — The Daily Post",
  description: "Choose your subscription plan for unlimited access to The Daily Post.",
  alternates: {
    canonical: "/subscribe",
  },
};

// FAQ data — hoisted to module scope so it can be reused by both the
// visible FAQ section AND the FAQPage JSON-LD schema (so they never
// drift apart). Google's AI Overview and rich-results both consume this
// schema to surface Q&A snippets directly in search results.
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel your subscription at any time. You'll keep access until the end of your billing period.",
  },
  {
    q: "What's included in the free plan?",
    a: "5 free articles per month, breaking news alerts, and newsletter signup. No credit card required.",
  },
  {
    q: "Do you offer student discounts?",
    a: "Yes! Students get 50% off any paid plan. Contact us with your .edu email for verification.",
  },
  {
    q: "Can I share my subscription?",
    a: "All Access subscribers can gift one year of Digital Basic to a friend annually.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    icon: BookOpen,
    accent: "border-stone-300",
    features: [
      "5 free articles per month",
      "Standard quality ads",
      "Breaking news alerts",
      "Newsletter signup",
    ],
    notIncluded: [
      "No ad-free reading",
      "No AI audio narration",
      "No premium investigations",
    ],
    cta: "Current plan",
    ctaHref: null,
  },
  {
    name: "Digital Basic",
    price: "$4.99",
    period: "per month",
    icon: Zap,
    accent: "border-black bg-stone-50 dark:bg-stone-900",
    badge: "Most Popular",
    features: [
      "Unlimited articles",
      "Ad-free reading experience",
      "AI-narrated audio (TTS)",
      "Full archive access",
      "Bookmarks sync across devices",
    ],
    notIncluded: [],
    cta: "Subscribe Now",
    ctaHref: "/api/checkout?tier=digital",
  },
  {
    name: "All Access",
    price: "$9.99",
    period: "per month",
    icon: Crown,
    accent: "border-black bg-black text-white dark:border-white",
    badge: "Best Value",
    features: [
      "Everything in Digital Basic",
      "Premium newsletter content",
      "Ad-free podcasts",
      "Early access to investigations",
      "Exclusive events & Q&As",
      "Gift to a friend (1/year)",
    ],
    notIncluded: [],
    cta: "Go All Access",
    ctaHref: "/api/checkout?tier=allaccess",
  },
];

export default function SubscribePage() {
  // FAQPage JSON-LD — Google AI Overviews + rich-results consume this
  // to surface Q&A snippets directly in search results. Built from the
  // same FAQS array the visible page renders, so they never drift apart.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: `${SITE_URL}/subscribe`,
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header />

      <main className="flex-1">
        {/* Hero band */}
        <section className="border-b-2 border-black bg-stone-50 dark:border-white dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to homepage
            </Link>
            <h1 className="mt-4 font-headline text-4xl font-black leading-none text-black dark:text-white sm:text-5xl">
              Choose your plan
            </h1>
            <p className="mt-3 font-body text-lg italic text-stone-600 dark:text-stone-400">
              Independent journalism, powered by readers like you. Cancel anytime.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-[1400px] px-4 py-12">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {tiers.map((tier) => {
                const Icon = tier.icon;
                return (
                  <div
                    key={tier.name}
                    className={`relative flex flex-col rounded-sm border-2 ${tier.accent} p-6`}
                  >
                    {tier.badge && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-red-700 px-3 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-white">
                        {tier.badge}
                      </span>
                    )}
                    <span className="flex h-10 w-10 items-center justify-center rounded-full">
                      <Icon className="h-8 w-8" />
                    </span>
                    <h2 className="mt-4 font-headline text-2xl font-black">{tier.name}</h2>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-headline text-4xl font-black">{tier.price}</span>
                      <span className="font-sans text-sm opacity-60">{tier.period}</span>
                    </div>

                    {/* Features */}
                    <ul className="mt-6 flex-1 space-y-2">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 font-sans text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                          {f}
                        </li>
                      ))}
                      {tier.notIncluded.map((f) => (
                        <li key={f} className="flex items-start gap-2 font-sans text-sm opacity-40 line-through">
                          <span className="mt-0.5 h-4 w-4 shrink-0">✕</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {tier.ctaHref ? (
                      <Link
                        href={tier.ctaHref}
                        className={`mt-6 w-full rounded-none px-6 py-3 text-center font-sans text-sm font-bold uppercase tracking-wider transition-colors ${
                          tier.name === "All Access"
                            ? "bg-white text-black hover:bg-stone-200"
                            : "bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200"
                        }`}
                      >
                        {tier.cta}
                      </Link>
                    ) : (
                      <span className="mt-6 block w-full rounded-none border border-stone-300 px-6 py-3 text-center font-sans text-sm font-bold uppercase tracking-wider opacity-50 dark:border-stone-700">
                        {tier.cta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Trust signals */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-12">
            {/* Money-back guarantee badge */}
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-900">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <p className="mt-3 font-headline text-lg font-bold text-black dark:text-white">
                30-day money-back guarantee. No questions asked.
              </p>
              <p className="mt-1 font-sans text-sm text-stone-500 dark:text-stone-400">
                Try any plan risk-free. If it&apos;s not for you, we&apos;ll refund every cent.
              </p>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <SubscriberCount />
              <p className="font-sans text-sm text-stone-600 dark:text-stone-400">
                Join 2,847+ readers who trust The Daily Post
              </p>
            </div>

            {/* Trust badges row */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3">
              <span className="inline-flex items-center gap-1.5 font-sans text-xs text-stone-600 dark:text-stone-400">
                <Lock className="h-3.5 w-3.5" /> Secure payment
              </span>
              <span className="inline-flex items-center gap-1.5 font-sans text-xs text-stone-600 dark:text-stone-400">
                <Check className="h-3.5 w-3.5" /> Cancel anytime
              </span>
              <span className="inline-flex items-center gap-1.5 font-sans text-xs text-stone-600 dark:text-stone-400">
                <Check className="h-3.5 w-3.5" /> No hidden fees
              </span>
            </div>

            {/* Payment methods */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-500">
                <CreditCard className="h-3.5 w-3.5" /> We accept
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {["Visa", "Mastercard", "Amex", "PayPal"].map((brand) => (
                  <span
                    key={brand}
                    className="rounded border border-stone-300 bg-stone-50 px-3 py-1.5 font-sans text-xs font-bold text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                  >
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-stone-50 dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-12">
            <h2 className="mb-6 font-headline text-2xl font-black text-black dark:text-white">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.q} className="border-b border-stone-200 pb-4 dark:border-stone-800">
                  <h3 className="font-headline text-lg font-bold text-black dark:text-white">
                    {faq.q}
                  </h3>
                  <p className="mt-1 font-body text-[15px] leading-relaxed text-stone-600 dark:text-stone-400">
                    {faq.a}
                  </p>
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
