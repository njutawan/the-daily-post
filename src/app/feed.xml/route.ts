import { getPublicArticleCatalog } from "@/lib/public-articles";
import { generateRss } from "@/lib/rss";

export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  const xml = generateRss(await getPublicArticleCatalog());
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
