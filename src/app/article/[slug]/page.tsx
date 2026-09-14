import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleCard } from "@/components/ArticleCard";
import { ReadingProgress } from "@/components/ReadingProgress";
import { BookmarkButton } from "@/components/BookmarkButton";
import { ShareBar } from "@/components/ShareBar";
import { detectEntities } from "@/lib/ner";
import { ListenToArticle } from "@/components/ListenToArticle";
import { Comments } from "@/components/Comments";
import { ReportTypo } from "@/components/ReportTypo";
import { ViewTracker } from "@/components/ViewTracker";
import { ViewCount } from "@/components/ViewCount";
import { ReadingTracker } from "@/components/ReadingTracker";
import { AdUnit } from "@/components/AdUnit";
import { TableOfContents } from "@/components/TableOfContents";
import { PaywallGate } from "@/components/PaywallGate";
import { StickySubscribeCTA } from "@/components/StickySubscribeCTA";
import { PullQuote } from "@/components/mdx/PullQuote";
import { Embed } from "@/components/mdx/Embed";
import { allArticles, getArticleBySlug, trendingStories } from "@/data/articles";
import { getMDXArticle, getArticleSlugs, extractHeadings } from "@/lib/mdx-articles";
import { MDXRemote } from "next-mdx-remote/rsc";
import {
  Clock,
  Calendar,
  ChevronRight,
} from "lucide-react";

export function generateStaticParams() {
  const dataSlugs = allArticles.map((a) => ({ slug: a.slug }));
  const mdxSlugs = getArticleSlugs().map((s) => ({ slug: s }));
  // Deduplicate: prefer MDX if same slug exists in both
  const all = [...mdxSlugs, ...dataSlugs.filter((d) => !mdxSlugs.some((m) => m.slug === d.slug))];
  return all;
}

// ISR: statically generate at build time, then revalidate in the background
// every 5 minutes. Article pages are read-heavy and change rarely — ISR
// gives sub-50ms response times while still picking up view-count + comment
// updates without a full rebuild.
export const revalidate = 300; // 5 minutes

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mdxArticle = getMDXArticle(slug);
  const dataArticle = getArticleBySlug(slug);
  if (!mdxArticle && !dataArticle) return { title: "Article Not Found — The Daily Post" };
  const title = mdxArticle?.title || dataArticle!.title;
  const deck = mdxArticle?.deck || dataArticle!.deck;
  const category = mdxArticle?.category || dataArticle!.category;
  const author = mdxArticle?.author || dataArticle!.author;
  const publishedAt = mdxArticle?.publishedAt || dataArticle!.publishedAt;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.thedailypost.example";
  const ogImage = `/api/og/${slug}`;
  const absoluteOgImage = `${siteUrl}${ogImage}`;
  const articleUrl = `${siteUrl}/article/${slug}`;

  // Auto-detect YouTube embeds from MDX content
  const ogVideos: Array<{ url: string; width: number; height: number; alt: string }> = [];
  if (mdxArticle?.content) {
    // Match <Embed type="youtube" id="VIDEO_ID" />
    const youtubeMatches = mdxArticle.content.matchAll(/<Embed\s+type=["']youtube["']\s+id=["']([A-Za-z0-9_-]{11})["']/g);
    for (const m of youtubeMatches) {
      const videoId = m[1];
      ogVideos.push({
        url: `https://www.youtube.com/embed/${videoId}`,
        width: 1280,
        height: 720,
        alt: title,
      });
    }
  }

  const otherMeta: Record<string, string> = {
    "article:published_time": publishedAt,
    "article:author": author,
    "article:section": category,
    "article:tag": [category, "news", "The Daily Post"].join(", "),
    "news_keywords": `${category}, ${author}, breaking news, The Daily Post`,
  };

  // Add OG video meta tags if videos found
  if (ogVideos.length > 0) {
    ogVideos.forEach((v, i) => {
      otherMeta[`og:video:url[${i}]`] = v.url;
      otherMeta[`og:video:width[${i}]`] = String(v.width);
      otherMeta[`og:video:height[${i}]`] = String(v.height);
      otherMeta[`og:video:type[${i}]`] = "text/html";
    });
    otherMeta["og:video:tag"] = category;
  }

  return {
    title: `${title} — The Daily Post`,
    description: deck,
    keywords: [category, author, "The Daily Post", "news", "breaking news"],
    authors: [{ name: author }],
    alternates: {
      canonical: `/article/${slug}`,
      // hreflang — English is the default. Append { "es-MX": `/es/article/${slug}` }
      // here when a Spanish version exists.
      languages: {
        "en-US": `/article/${slug}`,
      },
    },
    openGraph: {
      title: title,
      description: deck,
      type: "article",
      url: articleUrl,
      siteName: "The Daily Post",
      images: [
        { url: absoluteOgImage, width: 1200, height: 630, alt: title },
      ],
      videos: ogVideos.length > 0 ? ogVideos.map((v) => ({
        url: v.url,
        width: v.width,
        height: v.height,
        alt: v.alt,
      })) : undefined,
      publishedTime: publishedAt,
      modifiedTime: publishedAt,
      authors: [author],
      tags: [category, "news", "The Daily Post"],
    },
    twitter: {
      card: ogVideos.length > 0 ? "player" : "summary_large_image",
      title: title,
      description: deck,
      images: [absoluteOgImage],
      creator: "@thedailypost",
      players: ogVideos.length > 0 ? ogVideos.map((v) => ({ playerUrl: v.url, streamUrl: v.url, width: v.width, height: v.height })) : undefined,
    },
    other: otherMeta,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try MDX content first, fall back to data.ts
  const mdxArticle = getMDXArticle(slug);
  const dataArticle = getArticleBySlug(slug);

  if (!mdxArticle && !dataArticle) notFound();

  // Use MDX article if available, otherwise fall back to data.ts
  const isMDX = !!mdxArticle;
  const title = mdxArticle?.title || dataArticle!.title;
  const deck = mdxArticle?.deck || dataArticle!.deck;
  const category = mdxArticle?.category || dataArticle!.category;
  const author = mdxArticle?.author || dataArticle!.author;
  const authorTitle = mdxArticle?.authorTitle || dataArticle!.authorTitle;
  const publishedAt = mdxArticle?.publishedAt || dataArticle!.publishedAt;
  const readTime = mdxArticle?.readTime || dataArticle!.readTime;
  const imageUrl = mdxArticle?.imageUrl || dataArticle!.imageUrl;
  const imageCaption = mdxArticle?.imageCaption || dataArticle!.imageCaption;
  const imageCredit = mdxArticle?.imageCredit || dataArticle!.imageCredit;
  const isBreaking = mdxArticle?.breaking || dataArticle!.breaking;
  const isPremium = Boolean(mdxArticle?.premium || dataArticle?.premium);
  const articleSlug = slug;

  // Extract headings for TOC (from MDX content or from data.ts body)
  const headings = isMDX
    ? extractHeadings(mdxArticle!.content)
    : [];

  const related = trendingStories.filter((a) => a.slug !== slug).slice(0, 4);
  const publishedDate = new Date(publishedAt);
  // Use UTC explicitly to avoid server/client timezone hydration mismatches.
  const formattedDate = publishedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const formattedTime = publishedDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.thedailypost.example";

  // Full untruncated body text — used for NER. We don't want to limit
  // entity detection to just the first 5k chars of `articleBody` (we'd
  // miss people mentioned at the end of long articles).
  const articleBodySource: string =
    isMDX && mdxArticle?.content
      ? mdxArticle.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : dataArticle?.body
        ? dataArticle.body.join("\n\n")
        : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: deck,
    image: [`${siteUrl}${imageUrl}`],
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: [
      {
        "@type": "Person",
        name: author,
        jobTitle: authorTitle,
        url: `${siteUrl}/article?author=${encodeURIComponent(author)}`,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: "The Daily Post",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.svg`,
      },
    },
    articleSection: category,
    keywords: [category, "news", "The Daily Post", author],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/article/${articleSlug}`,
    },
    isAccessibleForFree: !isPremium,
    hasPart: isPremium
      ? {
          "@type": "WebPageElement",
          isAccessibleForFree: false,
          cssSelector: ".reading-column",
        }
      : undefined,
    // Enrichments for AI Overview / answer-engine citation (GEO):
    inLanguage: "en-US",
    copyrightYear: new Date(publishedAt).getFullYear(),
    copyrightHolder: { "@type": "Organization", name: "The Daily Post" },
    // wordCount helps AI engines judge article depth before citing.
    wordCount: mdxArticle?.content
      ? mdxArticle.content.split(/\s+/).filter(Boolean).length
      : dataArticle?.body
        ? dataArticle.body.join(" ").split(/\s+/).filter(Boolean).length
        : readTime * 250,
    // articleBody: full text for AI crawlers (only for non-premium articles
    // — premium articles are gated by the paywall and not exposed).
    articleBody:
      !isPremium && isMDX && mdxArticle?.content
        ? mdxArticle.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000)
        : !isPremium && dataArticle?.body
          ? dataArticle.body.join("\n\n").slice(0, 5000)
          : undefined,
    // isPartOf links the article to its section (category) — helps AI
    // engines understand the topical context.
    isPartOf: {
      "@type": "CollectionPage",
      name: category,
      url: `${siteUrl}/category/${category.toLowerCase()}`,
    },
    // about: structured entities mentioned in the article. Uses lightweight
    // regex-based NER (src/lib/ner.ts) to detect People, Organizations, and
    // Places in the body. AI engines (Google AI Overviews, ChatGPT, Perplexity)
    // use these `Thing` entities to link the article to knowledge graph entries
    // for richer citation. Always includes the category + brand as fallbacks.
    about: [
      { "@type": "Thing", name: category },
      { "@type": "Organization", name: "The Daily Post" },
      ...detectEntities(articleBodySource, 8),
    ].slice(0, 12),
    // alternativeHeadline = deck (subtitle) — used by some AI engines
    // as a shorter title variant for citation.
    alternativeHeadline: deck,
  };

  // BreadcrumbList JSON-LD — helps AI engines cite the article's place
  // in the site hierarchy (Home > Category > Article).
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category,
        item: `${siteUrl}/category/${category.toLowerCase()}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `${siteUrl}/article/${articleSlug}`,
      },
    ],
  };

  const paragraphs =
    !isMDX && dataArticle?.body && dataArticle.body.length > 0
      ? dataArticle.body
      : !isMDX
        ? [
            deck,
            "Full coverage of this developing story will be updated as more details emerge. Please check back for the latest reporting from The Daily Post newsroom.",
          ]
        : [];

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ReadingProgress />
      <ViewTracker slug={articleSlug} />
      <ReadingTracker slug={articleSlug} />
      <Header />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b border-stone-200 bg-stone-50">
          <div className="mx-auto max-w-3xl px-4 py-2.5">
            <nav className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <Link href="/" className="hover:text-black">
                Home
              </Link>
              <ChevronRight className="h-3 w-3" />
              <Link href={`#${category.toLowerCase()}`} className="hover:text-black">
                {category}
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="truncate text-stone-700">
                {title.slice(0, 40)}…
              </span>
            </nav>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-8">
          {/* Category */}
          <Link href={`#${category.toLowerCase()}`}>
            <span className="inline-block border-b-2 border-red-700 pb-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-red-700">
              {category}
            </span>
          </Link>

          {/* Headline */}
          <h1 className="mt-4 font-headline text-4xl font-black leading-[1.1] text-black sm:text-5xl">
            {title}
          </h1>

          {/* Deck / sub-headline */}
          {deck && (
            <p className="mt-4 font-body text-xl leading-relaxed text-stone-700">
              {deck}
            </p>
          )}

          {/* Byline */}
          <div className="mt-6 flex flex-col gap-3 border-y border-stone-200 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-800 text-sm font-bold uppercase text-white">
                {author
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="font-sans text-sm">
                <div className="font-bold text-stone-900">
                  By{" "}
                  <Link
                    href={`/author/${author
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "")}`}
                    className="hover:underline decoration-stone-300 underline-offset-2"
                  >
                    {author}
                  </Link>
                </div>
                {authorTitle && (
                  <div className="text-xs text-stone-500">{authorTitle}</div>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formattedTime} · {readTime} min read
                  </span>
                  <ViewCount slug={articleSlug} />
                </div>
              </div>
            </div>

            {/* Social sharing */}
            <ShareBar slug={articleSlug} title={title} />
            <BookmarkButton slug={articleSlug} />
          </div>

          {/* Listen to article (TTS) */}
          {paragraphs[0] && (
            <div className="mt-4">
              <ListenToArticle text={paragraphs[0]} title={title} />
            </div>
          )}

          {/* Hero image */}
          <figure className="mt-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100">
              <Image
                src={imageUrl}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
            {(imageCaption || imageCredit) && (
              <figcaption className="mt-2 border-l-2 border-stone-300 pl-3">
                {imageCaption && (
                  <p className="font-sans text-sm leading-relaxed text-stone-700">
                    {imageCaption}
                  </p>
                )}
                {imageCredit && (
                  <p className="mt-1 font-sans text-xs text-stone-400">
                    {imageCredit}
                  </p>
                )}
              </figcaption>
            )}
          </figure>

          {/* Body — wrapped in PaywallGate for metering/premium gating */}
          <PaywallGate slug={articleSlug} isPremium={isPremium}>
          {/* Body */}
          <div className="reading-column dropcap mt-8 font-body text-lg leading-[1.8] text-stone-800 sm:text-xl">
            {isMDX && mdxArticle ? (
              <MDXRemote
                source={mdxArticle.content}
                components={{ PullQuote, Embed }}
              />
            ) : (
              <>
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}

                {/* Pull quote */}
                <blockquote className="my-8 border-y-2 border-black py-6 text-center">
                  <p className="font-headline text-2xl font-bold italic leading-snug text-black sm:text-3xl">
                    “This is what governing looks like when we put the country ahead of the next news cycle.”
                  </p>
                  <footer className="mt-3 font-sans text-xs font-bold uppercase tracking-wider text-stone-500">
                    — Majority Leader Sarah Hinton (D-Mich.)
                  </footer>
                </blockquote>

                <p>
                  Reporting was contributed by correspondents in Washington, Brussels, and the Eastern theater. This is a developing story and will be updated.
                </p>
              </>
            )}
          </div>
          </PaywallGate>

          {/* Table of Contents (only for MDX articles with headings) */}
          {headings.length > 0 && (
            <div className="my-8 border-t border-stone-200 pt-6 dark:border-stone-800">
              <TableOfContents headings={headings} />
            </div>
          )}

          {/* Mid-Article Ad (300×250) */}
          <div className="my-8">
            <AdUnit size="rectangle" slotId="article-mid-content" label="Advertisement" />
          </div>

          {/* Tags / topic chips */}
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-6">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Topics:
            </span>
            {[category, "Congress", "Infrastructure", "2026"].map((t) => (
              <Link
                key={t}
                href="#"
                className="rounded-full border border-stone-300 px-3 py-1 font-sans text-xs text-stone-700 hover:border-black hover:bg-black hover:text-white"
              >
                {t}
              </Link>
            ))}
          </div>

          {/* Author card */}
          <div className="mt-8 flex items-start gap-4 border border-stone-200 bg-stone-50 p-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-stone-800 text-base font-bold uppercase text-white">
              {author
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <h4 className="font-headline text-lg font-bold text-black">{author}</h4>
              <p className="text-xs font-sans text-stone-500">
                {authorTitle} · The Daily Post
              </p>
              <p className="mt-2 font-body text-sm leading-relaxed text-stone-700">
                {author} covers {category.toLowerCase()} for The Daily Post, with a focus on the people and institutions shaping the story.
              </p>
              <button className="mt-3 inline-flex items-center gap-1.5 border-b border-black pb-0.5 font-sans text-xs font-bold uppercase tracking-wider text-black transition-all hover:gap-2.5">
                Follow {author.split(" ")[0]}
              </button>
            </div>
          </div>
        </article>

        {/* Comments */}
        <div className="mx-auto max-w-3xl px-4">
          <Comments slug={articleSlug} />
          <ReportTypo slug={articleSlug} />
        </div>

        {/* Footer Leaderboard Ad (728×90) */}
        <div className="border-b border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-3xl px-4 py-6">
            <AdUnit size="leaderboard" slotId="article-footer-leaderboard" label="Advertisement" />
          </div>
        </div>

        {/* Related stories */}
        <section className="border-t-2 border-black bg-stone-50">
          <div className="mx-auto max-w-[1400px] px-4 py-10">
            <h2 className="mb-6 font-headline text-2xl font-black text-black">
              More to Read
            </h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} layout="standard" showSummary={false} />
              ))}
            </div>
          </div>
        </section>

        {/* Floating subscribe CTA — appears after 50% scroll */}
        <StickySubscribeCTA />
      </main>

      <Footer />
    </div>
  );
}
