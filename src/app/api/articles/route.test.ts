import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockDb, mockGetSessionUser } = vi.hoisted(() => ({
  mockDb: { article: { findMany: vi.fn(), count: vi.fn() } },
  mockGetSessionUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth-unified", () => ({
  getSessionUser: mockGetSessionUser,
  requireRole: vi.fn(),
}));

import { GET } from "./route";

const article = {
  id: "article_123",
  slug: "published-story",
  title: "Published story",
  excerpt: "A safe public excerpt.",
  premium: true,
  body: "Full protected body must not be included in a reader article listing.",
  status: "published",
  author: { id: "author_123", name: "Reporter", byline: "Reporter" },
  reviewer: null,
};

describe("reader article listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: "reader_123", role: "reader" });
    mockDb.article.findMany.mockResolvedValue([article]);
    mockDb.article.count.mockResolvedValue(1);
  });

  it("returns metadata and excerpts but never article bodies", async () => {
    const response = await GET(new NextRequest("https://news.example/api/articles", {
      headers: { "x-forwarded-for": "203.0.113.61" },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload.articles[0].excerpt).toBe(article.excerpt);
    expect(payload.articles[0]).not.toHaveProperty("body");
    expect(JSON.stringify(payload)).not.toContain("Full protected body");
  });
});
