import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { BackToTop } from "@/components/BackToTop";
import { AuthProvider } from "@/components/auth-provider";
import { UnifiedAuthProvider } from "@/components/unified-auth-provider";
import { Analytics } from "@/components/Analytics";
import { SITE_URL } from "@/lib/site";

/**
 * Fonts are self-hosted (woff2 files in ./fonts, sourced from the
 * @fontsource project) instead of fetched from Google Fonts at build
 * time. This keeps `next build` working offline/behind a proxy and
 * serves fonts from our own domain (no third-party request).
 * The headline/body/sans files are variable fonts, so they cover the
 * same weight ranges the previous next/font/google config requested.
 */
const fontLogo = localFont({
  src: "./fonts/unifrakturmaguntia-latin-400-normal.woff2",
  variable: "--font-logo",
  weight: "400",
  display: "swap",
});

const fontHeadline = localFont({
  src: "./fonts/playfair-display-latin-wght-normal.woff2",
  variable: "--font-headline",
  weight: "400 900",
  display: "swap",
});

const fontBody = localFont({
  src: "./fonts/lora-latin-wght-normal.woff2",
  variable: "--font-body",
  weight: "400 700",
  display: "swap",
});

const fontSans = localFont({
  src: "./fonts/libre-franklin-latin-wght-normal.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // hreflang — declares the canonical + English variant so search
  // engines know this is the default locale. When you add multi-lang
  // (e.g. /es/, /fr/), append `{ fr: '…/fr/' }` here and add a
  // corresponding `alternates.languages` block to each translated page.
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/",
    },
  },
  title: "The Daily Post — Breaking News, Politics, Opinion & Analysis",
  description:
    "The Daily Post delivers breaking news, in-depth political analysis, world reporting, technology coverage, and bold opinion from a world-class newsroom.",
  keywords: [
    "news",
    "politics",
    "opinion",
    "world news",
    "technology",
    "business",
    "climate",
    "sports",
    "The Daily Post",
  ],
  authors: [{ name: "The Daily Post Newsroom" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "The Daily Post",
    description: "Democracy Dies in Darkness. Breaking news and fearless journalism.",
    siteName: "The Daily Post",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Daily Post",
    description: "Democracy Dies in Darkness.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Organization + WebSite JSON-LD — gives search engines + AI crawlers
  // a machine-readable description of who we are. Critical for AI Overviews
  // and answer-engine citations (ChatGPT, Perplexity, Claude).
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The Daily Post",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    description:
      "The Daily Post delivers breaking news, in-depth political analysis, world reporting, technology coverage, and bold opinion from a world-class newsroom.",
    sameAs: [
      "https://twitter.com/thedailypost",
      "https://www.facebook.com/thedailypost",
      "https://www.linkedin.com/company/thedailypost",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "newsroom",
        email: "newsroom@daily-post.example",
      },
    ],
    publishingPrinciples: `${SITE_URL}/llms.txt`,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The Daily Post",
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: "The Daily Post",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body
        className={`${fontLogo.variable} ${fontHeadline.variable} ${fontBody.variable} ${fontSans.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <UnifiedAuthProvider>
              {children}
              <BackToTop />
              <Toaster />
              <SonnerToaster position="top-right" richColors closeButton />
            </UnifiedAuthProvider>
          </AuthProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
