import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { allArticles } from "@/data/articles";

const { mockDb } = vi.hoisted(() => ({
  mockDb: { article: { findMany: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { GET } from "./route";

const publishedEditorialArticle = {
  id: "article_db_1",
  slug: "db-investigation",
  title: "Database Investigation",
  excerpt: "Public teaser text.",
  premium: true,
  category: "politics",
  tags: "investigation",
  heroImage: null,
  heroCaption: null,
  publishedAt: new Date("2026-10-01T12:00:00.000Z"),
  updatedAt: new Date("2026-10-01T12:00:00.000Z"),
  featured: false,
  viewCount: 0,
  commentCount: 0,
  author: {
    id: "author_db_1",
    name: "Reporter",
    byline: "Reporter",
    avatarUrl: null,
    role: "editor",
  },
  body: "PRIVATE PREMIUM BODY MUST NOT APPEAR IN THIS RESPONSE.",
};

describe("GET /api/article-index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.article.findMany.mockResolvedValue([publishedEditorialArticle]);
  });

  it("returns published editorial articles as safe metadata without selecting bodies", async () => {
    const response = await GET(new NextRequest("https://example.test/api/article-index"));
    const payload = await response.json() as { articles: Array<Record<string, unknown>> };
    const query = mockDb.article.findMany.mock.calls[0][0];

    expect(response.status).toBe(200);
    expect(payload.articles.some((article) => article.slug === publishedEditorialArticle.slug)).toBe(true);
    expect(payload.articles.every((article) => !Object.hasOwn(article, "body"))).toBe(true);
    expect(query.select).not.toHaveProperty("body");
    expect(JSON.stringify(payload)).not.toContain(publishedEditorialArticle.body);
  });

  it("returns only safe article-card metadata for static articles too", async () => {
    const response = await GET(new NextRequest("https://example.test/api/article-index"));
    const payload = await response.json() as { articles: Array<Record<string, unknown>> };
    const bodyText = allArticles.find((article) => article.body?.length)?.body?.[0];

    expect(response.status).toBe(200);
    expect(payload.articles.length).toBeGreaterThan(0);
    expect(payload.articles.every((article) => !Object.hasOwn(article, "body"))).toBe(true);
    if (bodyText) expect(JSON.stringify(payload)).not.toContain(bodyText);
  });

  it("keeps body text out of query search responses too", async () => {
    const response = await GET(new NextRequest(
      "https://example.test/api/article-index?q=database",
    ));
    const payload = await response.json() as { articles: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(payload.articles.length).toBeGreaterThan(0);
    expect(payload.articles.some((article) => article.slug === publishedEditorialArticle.slug)).toBe(true);
    expect(payload.articles.every((article) => !Object.hasOwn(article, "body"))).toBe(true);
    expect(JSON.stringify(payload)).not.toContain(publishedEditorialArticle.body);
  });
});
