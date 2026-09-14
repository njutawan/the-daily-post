import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockDb, mockGetSessionUser, mockRateLimit } = vi.hoisted(() => ({
  mockDb: {
    article: { findUnique: vi.fn() },
    savedArticle: { upsert: vi.fn(), findMany: vi.fn() },
  },
  mockGetSessionUser: vi.fn(),
  mockRateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth-unified", () => ({ getSessionUser: mockGetSessionUser }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mockRateLimit }));

import { GET, POST } from "./route";

const user = { id: "user-1" };

function post(body: unknown) {
  return new NextRequest("https://news.example/api/saved-articles", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

describe("saved article mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSessionUser.mockResolvedValue(user);
    mockRateLimit.mockReturnValue({ ok: true });
  });

  it("requires authentication before reading saved articles", async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockDb.savedArticle.findMany).not.toHaveBeenCalled();
  });

  it("rejects a request without an article id or slug", async () => {
    const response = await POST(post({}));

    expect(response.status).toBe(400);
    expect(mockDb.article.findUnique).not.toHaveBeenCalled();
  });

  it("rejects unpublished articles before writing a save", async () => {
    mockDb.article.findUnique.mockResolvedValue({
      id: "article-1",
      slug: "draft",
      status: "draft",
    });

    const response = await POST(post({ slug: "draft" }));

    expect(response.status).toBe(403);
    expect(mockDb.savedArticle.upsert).not.toHaveBeenCalled();
  });

  it("resolves a slug and upserts a save for the authenticated user", async () => {
    const article = { id: "article-1", slug: "story", status: "published" };
    const saved = { id: "save-1", articleId: article.id, userId: user.id };
    mockDb.article.findUnique.mockResolvedValue(article);
    mockDb.savedArticle.upsert.mockResolvedValue(saved);

    const response = await POST(post({ slug: "story" }));

    expect(response.status).toBe(201);
    expect(mockDb.article.findUnique).toHaveBeenCalledWith({
      where: { slug: "story" },
      select: { id: true, slug: true, status: true },
    });
    expect(mockDb.savedArticle.upsert).toHaveBeenCalledWith({
      where: { userId_articleId: { userId: user.id, articleId: article.id } },
      create: { userId: user.id, articleId: article.id },
      update: {},
    });
    await expect(response.json()).resolves.toEqual({ ok: true, saved });
  });

  it("returns not found without mutating when the article does not exist", async () => {
    mockDb.article.findUnique.mockResolvedValue(null);

    const response = await POST(post({ articleId: "missing" }));

    expect(response.status).toBe(404);
    expect(mockDb.savedArticle.upsert).not.toHaveBeenCalled();
  });

  it("honors rate limits before resolving article data", async () => {
    mockRateLimit.mockReturnValue({ ok: false });

    const response = await POST(post({ slug: "story" }));

    expect(response.status).toBe(429);
    expect(mockDb.article.findUnique).not.toHaveBeenCalled();
  });
});
