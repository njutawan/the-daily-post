import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-unified";
import { logger } from "@/lib/logger";
import { rateLimitByKeyResponse, getClientIp } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ articleId: string }> };

/**
 * DELETE /api/saved-articles/[articleId] — unsave an article.
 *
 * The path param can be either a DB id (`cm...`) or a slug
 * (`senate-passes-landmark-infrastructure-bill`). The BookmarkButton
 * sends the slug; the editor dashboard sends the id. We resolve both.
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { articleId: param } = await ctx.params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 req/min per IP+user (save/unsave).
  const ip = getClientIp(req);
  const key = `ip:${ip}:user:${user.id || "anon"}`;
  const limited = rateLimitByKeyResponse(key, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  try {
    // Resolve the param to a DB article id. If it doesn't look like a
    // cuid (doesn't start with "cm" or isn't 20+ chars), treat it as a slug.
    let resolvedArticleId = param;
    if (!/^[a-z0-9]{20,}$/i.test(param)) {
      // Probably a slug — look it up.
      const article = await db.article.findUnique({
        where: { slug: param },
        select: { id: true },
      });
      if (!article) {
        // Not in DB — return 200 anyway (idempotent delete, nothing to remove).
        return NextResponse.json({ ok: true });
      }
      resolvedArticleId = article.id;
    }

    await db.savedArticle.deleteMany({
      where: { userId: user.id, articleId: resolvedArticleId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "[api/saved-articles/[id]] DELETE failed");
    return NextResponse.json({ error: "Failed to unsave" }, { status: 500 });
  }
}
