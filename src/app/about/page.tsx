import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft, Mail, Phone, MapPin, Shield, FileText, Cookie, Eye } from "lucide-react";

export const metadata: Metadata = {
  title: "About The Daily Post — The Daily Post",
  description: "Learn about The Daily Post's mission, values, and commitment to independent journalism.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <Header />

      <main className="flex-1">
        {/* Hero */}
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
              About The Daily Post
            </h1>
            <p className="mt-3 font-body text-lg italic text-stone-600 dark:text-stone-400">
              Democracy Dies in Darkness — Independent journalism for the public interest.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="font-headline text-2xl font-black text-black dark:text-white">Our Story</h2>
            <p className="mt-4 font-body text-lg leading-relaxed text-stone-700 dark:text-stone-300">
              The Daily Post was founded on a simple belief: that democracy requires an informed public, and that independent journalism is essential to holding power accountable. Our newsroom covers politics, world affairs, technology, climate, and the stories that shape our communities — without fear or favor.
            </p>
            <p className="mt-4 font-body text-lg leading-relaxed text-stone-700 dark:text-stone-300">
              We are committed to accuracy, transparency, and the highest ethical standards in everything we publish. When we make a mistake, we correct it promptly and openly. Our readers trust us because we earn that trust every day.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="font-headline text-2xl font-black text-black dark:text-white">Contact Us</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-stone-500" />
                <div>
                  <h3 className="font-sans text-sm font-bold text-black dark:text-white">Email</h3>
                  <p className="font-sans text-sm text-stone-600 dark:text-stone-400">newsroom@thedailypost.example</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-stone-500" />
                <div>
                  <h3 className="font-sans text-sm font-bold text-black dark:text-white">Phone</h3>
                  <p className="font-sans text-sm text-stone-600 dark:text-stone-400">+1 (202) 555-0100</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-stone-500" />
                <div>
                  <h3 className="font-sans text-sm font-bold text-black dark:text-white">Newsroom</h3>
                  <p className="font-sans text-sm text-stone-600 dark:text-stone-400">1301 K Street NW, Washington, D.C. 20005</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Corrections */}
        <section id="corrections" className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="font-headline text-2xl font-black text-black dark:text-white">Corrections</h2>
            <p className="mt-4 font-body text-lg leading-relaxed text-stone-700 dark:text-stone-300">
              We hold ourselves to the highest standards of accuracy. If you believe we have published an error, please contact our corrections desk at <span className="font-semibold text-red-700">corrections@thedailypost.example</span>. We review every submission and publish corrections promptly.
            </p>
          </div>
        </section>

        {/* Ethics */}
        <section id="ethics" className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="font-headline text-2xl font-black text-black dark:text-white">Ethics Policy</h2>
            <div className="mt-4 space-y-3">
              {[
                { icon: Shield, title: "Independence", text: "Our reporting is free from influence by advertisers, donors, or political interests." },
                { icon: FileText, title: "Transparency", text: "We disclose sources when possible and explain our methodology." },
                { icon: Eye, title: "Accuracy", text: "We verify facts before publication and correct errors openly." },
                { icon: Cookie, title: "Reader Trust", text: "We protect reader privacy and do not sell personal data." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <Icon className="mt-1 h-5 w-5 shrink-0 text-stone-500" />
                    <div>
                      <h3 className="font-sans text-sm font-bold text-black dark:text-white">{item.title}</h3>
                      <p className="font-sans text-sm text-stone-600 dark:text-stone-400">{item.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section id="accessibility" className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="font-headline text-2xl font-black text-black dark:text-white">Accessibility</h2>
            <p className="mt-4 font-body text-lg leading-relaxed text-stone-700 dark:text-stone-300">
              The Daily Post is committed to making our content accessible to all readers. Our website supports screen readers, keyboard navigation, and dark mode. If you encounter an accessibility issue, please contact us at <span className="font-semibold text-red-700">accessibility@thedailypost.example</span>.
            </p>
          </div>
        </section>

        {/* Legal */}
        <section className="bg-stone-50 dark:bg-stone-900">
          <div className="mx-auto max-w-3xl px-4 py-10">
            <h2 className="font-headline text-2xl font-black text-black dark:text-white">Legal</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { id: "terms", title: "Terms of Use", text: "By accessing The Daily Post, you agree to our terms of service." },
                { id: "privacy", title: "Privacy Policy", text: "We respect your privacy and protect your personal data." },
                { id: "cookies", title: "Cookie Policy", text: "We use cookies to improve your reading experience." },
                { id: "ad-choices", title: "Ad Choices", text: "Manage your advertising preferences." },
              ].map((item) => (
                <div key={item.id} id={item.id} className="border border-stone-200 p-4 dark:border-stone-700">
                  <h3 className="font-sans text-sm font-bold text-black dark:text-white">{item.title}</h3>
                  <p className="mt-1 font-sans text-sm text-stone-600 dark:text-stone-400">{item.text}</p>
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
