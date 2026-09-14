import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Data retention utilities — prune old analytics rows to keep the DB lean.
 * Call periodically (e.g. on startup or via a cron).
 */

const VIEW_RETENTION_DAYS = 90;
const SESSION_RETENTION_DAYS = 90;

/** Delete ArticleView rows older than VIEW_RETENTION_DAYS. */
export async function pruneOldViews(): Promise<number> {
  const cutoff = new Date(Date.now() - VIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const result = await db.articleView.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    logger.info({ pruned: result.count, cutoff }, "Pruned old article views");
    return result.count;
  } catch (err) {
    logger.error({ err }, "Failed to prune old article views");
    return 0;
  }
}

/** Delete ReadingSession rows older than SESSION_RETENTION_DAYS. */
export async function pruneOldSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const result = await db.readingSession.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    logger.info({ pruned: result.count, cutoff }, "Pruned old reading sessions");
    return result.count;
  } catch (err) {
    logger.error({ err }, "Failed to prune old reading sessions");
    return 0;
  }
}

/** Run all retention policies. */
export async function runRetention(): Promise<void> {
  await Promise.all([pruneOldViews(), pruneOldSessions()]);
}
