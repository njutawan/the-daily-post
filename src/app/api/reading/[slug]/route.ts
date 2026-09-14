import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getArticleBySlug } from "@/data/articles";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getIpHash(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const raw = fwd.split(",")[0].trim() || realIp || "unknown";
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 30 req/min per IP (reading session tracking).
  const limited = rateLimitResponse(req, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }

  let body: { scrollDepth?: unknown; timeOnPage?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const scrollDepth =
    typeof body.scrollDepth === "number"
      ? Math.min(100, Math.max(0, Math.round(body.scrollDepth)))
      : 0;
  const timeOnPage =
    typeof body.timeOnPage === "number"
      ? Math.min(7200, Math.max(0, Math.round(body.timeOnPage)))
      : 0;

  const ipHash = getIpHash(req);

  try {
    await db.readingSession.create({
      data: { articleSlug: slug, ipHash, scrollDepth, timeOnPage },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[/api/reading POST] error");
    return NextResponse.json(
      { ok: false, error: "Failed to record reading session." },
      { status: 500 }
    );
  }
}
