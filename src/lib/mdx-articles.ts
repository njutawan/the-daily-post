import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

export type MDXArticle = {
  slug: string;
  title: string;
  deck: string;
  category: string;
  author: string;
  authorTitle?: string;
  publishedAt: string; // ISO date
  imageUrl: string;
  imageCaption?: string;
  imageCredit?: string;
  breaking?: boolean;
  premium?: boolean;
  readTime: number; // calculated from word count
  content: string; // raw MDX body (without frontmatter)
};

/** Get all article slugs from the content directory. */
export function getArticleSlugs(): string[] {
  try {
    const files = fs.readdirSync(ARTICLES_DIR);
    return files
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

/** Read a single article by slug (returns frontmatter + raw MDX content). */
export function getMDXArticle(slug: string): MDXArticle | null {
  const filePath = path.join(ARTICLES_DIR, `${slug}.mdx`);
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    // Calculate reading time from word count (~200 wpm)
    const words = content.trim().split(/\s+/).length;
    const readTime = Math.max(1, Math.ceil(words / 200));

    return {
      slug,
      title: data.title || slug,
      deck: data.deck || "",
      category: data.category || "General",
      author: data.author || "Staff",
      authorTitle: data.authorTitle,
      publishedAt: data.publishedAt || new Date().toISOString(),
      imageUrl: data.imageUrl || "/images/capitol-1.jpg",
      imageCaption: data.imageCaption,
      imageCredit: data.imageCredit,
      breaking: data.breaking || false,
      premium: data.premium || false,
      readTime,
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Extract h2/h3 headings from MDX content for table of contents.
 * Looks for ## and ### markdown headings.
 */
export function extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, "").trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      headings.push({ level, text, id });
    }
  }

  return headings;
}
