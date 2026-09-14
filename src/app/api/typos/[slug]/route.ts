import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getArticleBySlug } from "@/data/articles";
import { rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Rate limit: 5 typo reports per minute per IP
  const limited = rateLimitResponse(req, { max: 5, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }

  let body: { quotedText?: unknown; correction?: unknown; reporter?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const quotedText = typeof body.quotedText === "string" ? body.quotedText.trim().slice(0, 500) : "";
  const correction = typeof body.correction === "string" ? body.correction.trim().slice(0, 500) : "";
  const reporter = typeof body.reporter === "string" ? body.reporter.slice(0, 60) : "anonymous";

  if (!quotedText) {
    return NextResponse.json({ ok: false, error: "Please select the text with the typo." }, { status: 422 });
  }
  if (!correction) {
    return NextResponse.json({ ok: false, error: "Please suggest a correction." }, { status: 422 });
  }

  try {
    const report = await db.typoReport.create({
      data: { articleSlug: slug, quotedText, correction, reporter },
    });
    return NextResponse.json(
      { ok: true, message: "Thanks — our copy desk will review this.", id: report.id },
      { status: 201 }
    );
  } catch (err) {
    logger.error({ err }, "[/api/typos POST] error");
    return NextResponse.json(
      { ok: false, error: "Failed to submit typo report." },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!getArticleBySlug(slug)) {
    return NextResponse.json({ ok: false, error: "Article not found." }, { status: 404 });
  }
  try {
    const reports = await db.typoReport.findMany({
      where: { articleSlug: slug },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, reports });
  } catch (err) {
    logger.error({ err }, "[/api/typos GET] error");
    return NextResponse.json(
      { ok: false, error: "Failed to load typo reports." },
      { status: 500 }
    );
  }
}
