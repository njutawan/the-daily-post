import { allArticles, categories } from "@/data/articles";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

type SitemapUrl = {
  loc: string;
  priority: string;
  changefreq: string;
  lastmod?: string;
};

export async function GET() {
  const staticUrls: SitemapUrl[] = [
    { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "hourly" },
    { loc: `${SITE_URL}/live`, priority: "0.9", changefreq: "always" },
    { loc: `${SITE_URL}/most-read`, priority: "0.8", changefreq: "hourly" },
    { loc: `${SITE_URL}/newsletters`, priority: "0.7", changefreq: "weekly" },
    { loc: `${SITE_URL}/signin`, priority: "0.3", changefreq: "monthly" },
    { loc: `${SITE_URL}/register`, priority: "0.3", changefreq: "monthly" },
    { loc: `${SITE_URL}/search`, priority: "0.3", changefreq: "weekly" },
    { loc: `${SITE_URL}/saved`, priority: "0.2", changefreq: "weekly" },
  ];

  const categoryUrls: SitemapUrl[] = categories
    .filter((c) => c !== "Live")
    .map((c) => ({
      loc: `${SITE_URL}/category/${c.toLowerCase()}`,
      priority: "0.8",
      changefreq: "hourly",
    }));

  const articleUrls: SitemapUrl[] = allArticles.map((a) => ({
    loc: `${SITE_URL}/article/${a.slug}`,
    priority: "0.7",
    changefreq: "daily",
    lastmod: new Date(a.publishedAt).toISOString().split("T")[0],
  }));

  // Author pages — one per unique author. Lower priority than articles
  // (they're aggregation pages, not primary content) but still
  // high-frequency since authors publish often.
  const uniqueAuthors = Array.from(
    new Set(allArticles.map((a) => a.author).filter(Boolean))
  );
  const authorUrls: SitemapUrl[] = uniqueAuthors.map((name) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return {
      loc: `${SITE_URL}/author/${slug}`,
      priority: "0.6",
      changefreq: "weekly",
    };
  });

  const all = [...staticUrls, ...categoryUrls, ...articleUrls, ...authorUrls];

  const urls = all
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ""}
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
