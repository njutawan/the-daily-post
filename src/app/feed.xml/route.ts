import { allArticles } from "@/data/articles";
import { generateRss } from "@/lib/rss";

export const dynamic = "force-static";

export async function GET() {
  const xml = generateRss(allArticles);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
