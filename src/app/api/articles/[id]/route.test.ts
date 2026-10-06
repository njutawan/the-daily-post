import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockDb, mockGetSessionUser, mockGetArticleAccess } = vi.hoisted(() => ({
  mockDb: { article: { findUnique: vi.fn() } },
  mockGetSessionUser: vi.fn(),
  mockGetArticleAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth-unified", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/paywall", () => ({ getArticleAccess: mockGetArticleAccess }));

import { GET } from "./route";

const article = {
  id: "article_123",
  slug: "subscriber-investigation",
  title: "Subscriber Investigation",
  excerpt: "A short public excerpt.",
  premium: true,
  body: "The complete protected article body must not be returned.",
  status: "published",
  authorId: "author_123",
  author: { id: "author_123", name: "Reporter", byline: "Reporter" },
  reviewer: null,
  reviews: [],
};

function request(ip: string) {
  return new NextRequest("https://news.example/api/articles/article_123", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("published article API paywall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue({ id: "reader_123", role: "reader" });
    mockDb.article.findUnique.mockResolvedValue(article);
  });

  it("returns only teaser metadata when the server denies article access", async () => {
    mockGetArticleAccess.mockResolvedValue({
      allowed: false,
      isSubscriber: false,
      readCount: 3,
      remaining: 0,
      limit: 3,
      reason: "metered",
    });

    const response = await GET(request("203.0.113.51"), { params: Promise.resolve({ id: article.id }) });
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.article.excerpt).toBe(article.excerpt);
    expect(payload.article).not.toHaveProperty("body");
    expect(JSON.stringify(payload)).not.toContain("complete protected article body");
    expect(mockGetArticleAccess).toHaveBeenCalledWith(expect.objectContaining({
      slug: article.slug,
      isPremium: true,
    }));
  });

  it("treats legacy mock subscriber roles as readers rather than staff", async () => {
    mockGetSessionUser.mockResolvedValue({ id: "reader_legacy", role: "subscriber" });
    mockGetArticleAccess.mockResolvedValue({
      allowed: false,
      isSubscriber: false,
      readCount: 3,
      remaining: 0,
      limit: 3,
      reason: "metered",
    });

    const response = await GET(request("203.0.113.53"), { params: Promise.resolve({ id: article.id }) });
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.article).not.toHaveProperty("body");
    expect(mockGetArticleAccess).toHaveBeenCalledOnce();
  });

  it("returns the body only after the server authorizes the reader", async () => {
    mockGetArticleAccess.mockResolvedValue({
      allowed: true,
      isSubscriber: true,
      readCount: 0,
      remaining: 3,
      limit: 3,
      reason: "subscriber",
    });

    const response = await GET(request("203.0.113.52"), { params: Promise.resolve({ id: article.id }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.article.body).toBe(article.body);
  });
});
