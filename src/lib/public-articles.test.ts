import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCache, mockDb } = vi.hoisted(() => ({
  mockCache: {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  },
  mockDb: {
    article: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidatePath: mockCache.revalidatePath,
  revalidateTag: mockCache.revalidateTag,
}));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import {
  getPublishedEditorialArticleBodyBySlug,
  revalidatePublicArticleCaches,
} from "@/lib/public-articles";

describe("public editorial article cache and access boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invalidates publication, popularity, article, category, and author caches", () => {
    revalidatePublicArticleCaches({
      slug: "new-editorial-story",
      category: "opinion",
      author: { byline: "A. Reporter", name: "Reporter" },
    });

    expect(mockCache.revalidateTag).toHaveBeenCalledWith("public-editorial-articles", { expire: 0 });
    expect(mockCache.revalidateTag).toHaveBeenCalledWith("popular", { expire: 0 });
    expect(mockCache.revalidateTag).toHaveBeenCalledWith("most-read", { expire: 0 });
    expect(mockCache.revalidateTag).toHaveBeenCalledWith("trending", { expire: 0 });

    const paths = mockCache.revalidatePath.mock.calls.map(([path]) => path);
    expect(paths).toContain("/");
    expect(paths).toContain("/article/new-editorial-story");
    expect(paths).toContain("/category/opinions");
    expect(paths).toContain("/category/opinion");
    expect(paths).toContain("/category/opinions/feed.xml");
    expect(paths).toContain("/author/a-reporter");
    expect(paths).toContain("/sitemap.xml");
  });

  it("loads an editorial body with a fresh premium flag and no shared cache", async () => {
    mockDb.article.findFirst.mockResolvedValue({
      body: "Authorized article body",
      premium: true,
    });

    await expect(getPublishedEditorialArticleBodyBySlug("premium-story")).resolves.toEqual({
      body: "Authorized article body",
      premium: true,
    });
    expect(mockDb.article.findFirst).toHaveBeenCalledWith({
      where: { slug: "premium-story", status: "published" },
      select: { body: true, premium: true },
    });
  });
});
