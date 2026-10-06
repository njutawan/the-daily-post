import { categories, getPublicCategoryName } from "@/data/categories";
import { getPublicArticleCatalog } from "@/lib/public-articles";
import { generateRss } from "@/lib/rss";
import { notFound } from "next/navigation";

export const dynamic = "force-static";
export const revalidate = 300;

export async function generateStaticParams() {
  return categories
    .filter((c) => c !== "Live")
    .map((c) => ({ cat: c.toLowerCase() }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cat: string }> }
) {
  const { cat } = await params;
  const categoryName = getPublicCategoryName(cat);
  if (!categories.includes(categoryName) || categoryName === "Live") notFound();

  const articles = (await getPublicArticleCatalog()).filter(
    (article) => getPublicCategoryName(article.category) === categoryName
  );
  const xml = generateRss(articles, {
    title: `${categoryName} — The Daily Post`,
    description: `The latest ${categoryName} coverage from The Daily Post newsroom.`,
    path: `/category/${cat}/feed.xml`,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
