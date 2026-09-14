import type { Article } from "@/data/articles";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const SITE_DESC = "Democracy Dies in Darkness. Breaking news, politics, opinion, and analysis from The Daily Post newsroom.";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateRss(
  articles: Article[],
  opts?: { title?: string; description?: string; path?: string }
): string {
  const title = opts?.title ?? SITE_NAME;
  const description = opts?.description ?? SITE_DESC;
  const path = opts?.path ?? "";
  const link = `${SITE_URL}${path}`;

  const items = articles
    .slice(0, 20)
    .map(
      (a) => `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${SITE_URL}/article/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/article/${a.slug}</guid>
      <description>${escapeXml(a.deck)}</description>
      <category>${escapeXml(a.category)}</category>
      <author>${escapeXml(a.author)}</author>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${link}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}${path || "/feed.xml"}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
