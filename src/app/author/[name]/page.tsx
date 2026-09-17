import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArticleCard } from "@/components/ArticleCard";
import { allArticles } from "@/data/articles";
import { SITE_URL } from "@/lib/site";

// ISR: author pages rarely change (only when the author publishes a new
// article or updates their bio). Revalidate every 10 minutes.
export const revalidate = 600;

// Pre-render the known authors at build time so their pages are static.
export function generateStaticParams() {
  const names = new Set<string>();
  for (const a of allArticles) {
    if (a.author) names.add(a.author);
  }
  return Array.from(names).map((name) => ({
    // Use the slugified form as the URL param (e.g. "eleanor-whitfield").
    // The page handler reverses this by looking up by name OR byline.
    name: slugifyName(name),
  }));
}

interface AuthorProfile {
  name: string;
  bio: string;
  byline: string | null;
  avatarUrl: string | null;
  role: string;
  articleCount: number;
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name: param } = await params;
  // The URL param is slugified (e.g. "eleanor-whitfield"). Reverse-resolve
  // by matching against the static article author names.
  const name = resolveAuthorName(param);

  if (!name) return { title: "Author not found — The Daily Post" };

  // Look up in our static catalog first — works without a DB hit.
  const staticArticles = allArticles.filter((a) => a.author === name);

  const siteUrl = SITE_URL;
  const authorUrl = `${siteUrl}/author/${slugifyName(name)}`;
  const bio = `${name} is a staff reporter at The Daily Post, contributing to ${uniqueCategories(staticArticles).join(", ") || "the newsroom"}.`;

  return {
    title: `${name} — The Daily Post`,
    description: bio,
    authors: [{ name }],
    alternates: {
      canonical: `/author/${slugifyName(name)}`,
    },
    openGraph: {
      title: `${name} — The Daily Post`,
      description: bio,
      type: "profile",
      url: authorUrl,
      siteName: "The Daily Post",
    },
    twitter: {
      card: "summary",
      title: `${name} — The Daily Post`,
      description: bio,
    },
  };
}

/**
 * Reverse-resolve a slugified name back to the actual author display name
 * by looking it up in the static article catalog. Falls back to the
 * param itself if no match (so the notFound() path can render).
 */
function resolveAuthorName(slugified: string): string | null {
  // Try exact slug match first.
  for (const a of allArticles) {
    if (slugifyName(a.author) === slugified) return a.author;
  }
  // Fallback: treat the param as a URL-decoded name (someone might have
  // visited /author/Eleanor%20Whitman directly).
  const decoded = decodeURIComponent(slugified).replace(/-/g, " ");
  for (const a of allArticles) {
    if (a.author.toLowerCase() === decoded.toLowerCase()) return a.author;
  }
  return null;
}

function uniqueCategories(articles: typeof allArticles): string[] {
  return Array.from(new Set(articles.map((a) => a.category)));
}

/**
 * Format an ISO date string as a human-readable "X ago" string.
 * Used to fill the ArticleCard's `time` field for DB articles.
 */
function relativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffH / 24);
  if (diffH < 1) return "just now";
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? "" : "s"} ago`;
  if (diffD < 7) return `${diffD} day${diffD === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: param } = await params;
  // Resolve the slugified param (e.g. "eleanor-whitfield") to the actual
  // display name. Returns null if no matching author exists.
  const name = resolveAuthorName(param);
  if (!name) {
    notFound();
  }

  // Pull articles from both the static catalog and the database
  // (editorial workflow articles published via the admin review flow).
  const staticArticles = allArticles.filter((a) => a.author === name);

  let dbProfile: AuthorProfile | null = null;
  let dbArticles: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    category: string;
    publishedAt: Date | null;
    heroImage: string | null;
  }> = [];

  try {
    // Match by byline first (editors set their byline on the profile page),
    // then by name.
    const user = await db.user.findFirst({
      where: {
        OR: [{ byline: name }, { name }],
        role: { in: ["editor", "admin"] },
      },
      select: {
        id: true,
        name: true,
        byline: true,
        bio: true,
        avatarUrl: true,
        role: true,
      },
    });

    if (user) {
      dbProfile = {
        name: user.byline || user.name || name,
        bio: user.bio || "",
        byline: user.byline,
        avatarUrl: user.avatarUrl,
        role: user.role,
        articleCount: 0,
      };

      // Fetch published articles by this author from the DB.
      dbArticles = await db.article.findMany({
        where: { authorId: user.id, status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 20,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          publishedAt: true,
          heroImage: true,
        },
      });
      dbProfile.articleCount = dbArticles.length;
    }
  } catch {
    // DB unavailable — fall back to static-only view.
  }

  // Combine static + DB articles (dedup by slug).
  const combined: Array<{
    slug: string;
    title: string;
    deck: string;
    category: string;
    publishedAt: string;
    imageUrl: string;
    author: string;
    readTime: number;
    time: string;
  }> = [];

  const seenSlugs = new Set<string>();
  for (const a of staticArticles) {
    if (!seenSlugs.has(a.slug)) {
      seenSlugs.add(a.slug);
      combined.push({
        slug: a.slug,
        title: a.title,
        deck: a.deck,
        category: a.category,
        publishedAt: a.publishedAt,
        imageUrl: a.imageUrl,
        author: a.author,
        readTime: a.readTime,
        time: a.time,
      });
    }
  }
  for (const a of dbArticles) {
    if (!seenSlugs.has(a.slug)) {
      seenSlugs.add(a.slug);
      const publishedAt = a.publishedAt?.toISOString() || new Date().toISOString();
      combined.push({
        slug: a.slug,
        title: a.title,
        deck: a.excerpt || "",
        category: a.category,
        publishedAt,
        imageUrl: a.heroImage || "/images/news-default.jpg",
        author: name,
        readTime: 4,
        time: relativeTime(publishedAt),
      });
    }
  }

  if (combined.length === 0 && !dbProfile) {
    notFound();
  }

  const displayName = dbProfile?.name || name;
  const bio = dbProfile?.bio || `${displayName} is a staff reporter at The Daily Post, contributing to ${uniqueCategories(staticArticles).join(", ") || "the newsroom"}.`;
  const categories = uniqueCategories(staticArticles);
  const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const siteUrl = SITE_URL;
  const authorUrl = `${siteUrl}/author/${slugifyName(name)}`;

  // Person JSON-LD — gives search engines + AI engines machine-readable
  // author info. Critical for E-E-A-T (Experience, Expertise, Authority,
  // Trustworthiness) scoring and AI Overview citation.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    url: authorUrl,
    jobTitle: dbProfile?.role === "admin" ? "Editor-in-Chief" : "Staff Reporter",
    worksFor: {
      "@type": "Organization",
      name: "The Daily Post",
      url: siteUrl,
    },
    description: bio,
    ...(dbProfile?.avatarUrl ? { image: dbProfile.avatarUrl } : {}),
    sameAs: [] as string[],
    // Articles this person has authored — Google + AI engines use this
    // to attribute articles to the right Person entity.
    knowsAbout: categories.length > 0 ? categories.map((c) => ({ "@type": "Thing", name: c })) : undefined,
  };

  // CollectionPage JSON-LD — wraps the article list so engines can
  // discover the author's bibliography.
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${displayName} — Articles`,
    url: authorUrl,
    isPartOf: { "@type": "WebSite", name: "The Daily Post", url: siteUrl },
    author: { "@type": "Person", name: displayName },
    hasPart: combined.slice(0, 10).map((a) => ({
      "@type": "NewsArticle",
      headline: a.title,
      url: `${siteUrl}/article/${a.slug}`,
      datePublished: a.publishedAt,
      articleSection: a.category,
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-stone-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <Header />

      <main className="flex-1">
        {/* Author masthead */}
        <section className="border-b border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-950">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
            <nav className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              <Link href="/" className="hover:text-black dark:hover:text-white">
                Home
              </Link>
              <span className="text-stone-300">›</span>
              <span className="text-black dark:text-white">Authors</span>
              <span className="text-stone-300">›</span>
              <span className="text-black dark:text-white">{displayName}</span>
            </nav>

            <div className="mt-6 flex items-start gap-5">
              {/* Avatar */}
              <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xl font-bold uppercase text-white sm:flex dark:bg-stone-700">
                {dbProfile?.avatarUrl ? (
                  // eslint disabled: avatar is a user-uploaded URL
                  <img src={dbProfile.avatarUrl} alt={displayName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                  {dbProfile?.role === "admin" ? "Editor-in-Chief" : "Staff Reporter"}
                </div>
                <h1 className="mt-2 font-headline text-4xl font-black text-black dark:text-white sm:text-5xl">
                  {displayName}
                </h1>
                <p className="mt-3 font-body text-lg leading-relaxed text-stone-600 dark:text-stone-400">
                  {bio}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-sans uppercase tracking-wider text-stone-500">
                  <span>{combined.length} articles</span>
                  {categories.length > 0 && (
                    <>
                      <span>·</span>
                      <span>Beats: {categories.join(", ")}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Articles by this author */}
        <section className="mx-auto max-w-[1400px] px-4 py-12">
          <div className="mb-6 flex items-end justify-between border-b-2 border-black pb-3 dark:border-white">
            <h2 className="font-headline text-2xl font-black text-black dark:text-white">
              Articles by {displayName}
            </h2>
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500">
              {combined.length} total
            </span>
          </div>

          {combined.length === 0 ? (
            <p className="py-12 text-center font-body text-stone-500">
              No published articles yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {combined.map((article) => (
                <ArticleCard
                  key={article.slug}
                  article={{
                    slug: article.slug,
                    title: article.title,
                    deck: article.deck,
                    category: article.category,
                    author: article.author,
                    time: article.time,
                    publishedAt: article.publishedAt,
                    readTime: article.readTime,
                    imageUrl: article.imageUrl,
                  }}
                  layout="standard"
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
