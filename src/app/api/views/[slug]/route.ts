import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getArticleBySlug } from "@/data/articles";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function getIpHash(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const raw = fwd.split(",")[0].trim() || realIp || "unknown";
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

// POST records a view for an article (called client-side on mount).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 60 req/min per IP (view tracking).
  const limited = rateLimitResponse(req, { max: 60, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }
  const ipHash = getIpHash(req);
  try {
    // IP-based dedup: skip if this IP already viewed this article in the last 24h
    const since = new Date(Date.now() - DEDUP_WINDOW_MS);
    const existing = await db.articleView.findFirst({
      where: { articleSlug: slug, ipHash, createdAt: { gte: since } },
      select: { id: true },
    });
    const alreadyViewed = !!existing;

    if (!alreadyViewed) {
      await db.articleView.create({ data: { articleSlug: slug, ipHash } });
      // Invalidate the popular + trending + most-read caches so the new view
      // is reflected on the next homepage render. The cache tags are defined
      // in src/lib/popular.ts. This is a no-op in dev (no ISR) but works in
      // production with `next start`. The second arg ("default") is the
      // cache-life profile required by Next.js 16's revalidateTag signature.
      try {
        revalidateTag("popular", "default");
        revalidateTag("trending", "default");
        revalidateTag("most-read", "default");
      } catch {
        // revalidateTag is only available in production ISR; ignore in dev.
      }
    }
    const count = await db.articleView.count({ where: { articleSlug: slug } });
    return NextResponse.json({ ok: true, views: count, deduped: alreadyViewed });
  } catch (err) {
    logger.error({ err }, "[/api/views POST] error");
    return NextResponse.json(
      { ok: false, error: "Failed to record view." },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 60 req/min per IP (view tracking).
  const limited = rateLimitResponse(req, { max: 60, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }
  try {
    const views = await db.articleView.count({ where: { articleSlug: slug } });
    return NextResponse.json({ ok: true, views });
  } catch (err) {
    logger.error({ err }, "[/api/views GET] error");
    return NextResponse.json(
      { ok: false, error: "Failed to fetch views." },
      { status: 500 }
    );
  }
}
