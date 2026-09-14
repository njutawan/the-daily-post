import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allArticles } from "@/data/articles";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/lib/auth-unified";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  // Rate limit: 5 req/min per IP+user (heavy CSV export).
  const user = await getSessionUser();
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user?.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 5, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });
  // Admin role guard — reject non-admin users.
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const rows = await db.typoReport.findMany({
      orderBy: { createdAt: "desc" },
    });
    const articleMap = new Map(allArticles.map((a) => [a.slug, a.title]));

    const header = "article_slug,article_title,quoted_text,correction,reporter,submitted_at\n";
    const lines = rows.map((r) =>
      [
        csvEscape(r.articleSlug),
        csvEscape(articleMap.get(r.articleSlug) || r.articleSlug),
        csvEscape(r.quotedText),
        csvEscape(r.correction),
        csvEscape(r.reporter),
        csvEscape(r.createdAt.toISOString()),
      ].join(",")
    );
    const csv = header + lines.join("\n") + (lines.length > 0 ? "\n" : "");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="typo-reports-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    logger.error({ err }, "[/api/admin/typos/export] error");
    return NextResponse.json(
      { ok: false, error: "Failed to export typo reports." },
      { status: 500 }
    );
  }
}
