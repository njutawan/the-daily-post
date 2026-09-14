import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser, requireRole, type Role } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

const CreateArticleSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  excerpt: z.string().max(500).optional().nullable(),
  body: z.string().max(50000).optional().default(""),
  category: z.enum([
    "politics", "world", "business", "tech",
    "opinion", "sports", "climate", "culture",
  ]).default("politics"),
  tags: z.string().max(200).optional().default(""),
  heroImage: z.string().url().optional().nullable(),
  heroCaption: z.string().max(300).optional().nullable(),
});

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  // Fallback for non-ASCII / empty titles: use a short random suffix.
  if (!base) {
    return `article-${Math.random().toString(36).slice(2, 10)}`;
  }
  return base;
}

/**
 * Generate a unique slug, retrying on the unique-constraint violation that
 * can occur when two editors concurrently create articles with the same
 * title. The `slug` column has a `@unique` constraint, so `db.article.create`
 * will throw P2002 — we catch it and bump the suffix.
 *
 * This is more robust than the old "findUnique-then-create" pattern which
 * had a TOCTOU race window.
 */
async function createWithUniqueSlug(
  baseSlug: string,
  data: Omit<Prisma.ArticleUncheckedCreateInput, "slug">
): Promise<{ id: string; slug: string }> {
  const MAX_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const slug = `${baseSlug}${suffix}`.slice(0, 90);
    try {
      const article = await db.article.create({ data: { ...data, slug } });
      return { id: article.id, slug: article.slug };
    } catch (err: unknown) {
      // Prisma P2002 = unique constraint violation. Anything else, rethrow.
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }
  // All retries exhausted — fall back to a random slug.
  const fallbackSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
  const article = await db.article.create({ data: { ...data, slug: fallbackSlug } });
  return { id: article.id, slug: article.slug };
}

/**
 * GET /api/articles — list articles with filters.
 * Query params:
 *   status: draft | pending_review | published | rejected | archived
 *   authorId: filter by author
 *   category: filter by category
 *   q: search title/excerpt
 *   limit, offset: pagination
 *
 * Editors see their own drafts + articles they wrote.
 * Admins see everything.
 * Readers see only published articles.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const status = url.searchParams.get("status") || undefined;
  const authorId = url.searchParams.get("authorId") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (status) where.status = status;
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { excerpt: { contains: q } },
    ];
  }

  // Role-based scoping
  if (user.role === "editor") {
    // Editors only see their own articles (in any status) plus published articles.
    if (!authorId) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { authorId: user.id },
        { status: "published" },
      ];
    } else if (authorId !== user.id) {
      // Editors can only request their own authorId filter.
      where.authorId = user.id;
    } else {
      where.authorId = authorId;
    }
  } else if (user.role === "admin") {
    if (authorId) where.authorId = authorId;
  } else {
    // Reader — only published.
    where.status = "published";
  }

  try {
    const [articles, total] = await Promise.all([
      db.article.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          author: { select: { id: true, name: true, byline: true } },
          reviewer: { select: { id: true, name: true } },
        },
      }),
      db.article.count({ where }),
    ]);

    return NextResponse.json({ articles, total, limit, offset });
  } catch (err) {
    logger.error({ err }, "[api/articles] GET failed");
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 });
  }
}

/**
 * POST /api/articles — create a new draft article.
 * Only editors and admins can create articles.
 *
 * Rate-limited: 20 article creations per minute per editor to prevent
 * draft spam.
 */
export async function POST(req: NextRequest) {
  const user = await requireRole("editor" as Role, "admin" as Role);
  if (!user) {
    return NextResponse.json({ error: "Only editors can create articles" }, { status: 403 });
  }

  const limit = rateLimit(req, { max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const baseSlug = slugify(data.title);

  try {
    const created = await createWithUniqueSlug(baseSlug, {
      title: data.title,
      excerpt: data.excerpt,
      body: data.body,
      category: data.category,
      tags: data.tags,
      heroImage: data.heroImage,
      heroCaption: data.heroCaption,
      status: "draft",
      authorId: user.id,
    });

    const article = await db.article.findUnique({
      where: { id: created.id },
      include: {
        author: { select: { id: true, name: true, byline: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    logger.error({ err, userId: user.id }, "[api/articles] POST failed");
    return NextResponse.json({ error: "Failed to create article" }, { status: 500 });
  }
}
