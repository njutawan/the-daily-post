import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth-unified";
import { db } from "@/lib/db";
import { hasPaidAccess } from "@/lib/subscription";

export const FREE_LIMIT = 3;

export type ArticleAccess = {
  allowed: boolean;
  isSubscriber: boolean;
  readCount: number;
  remaining: number;
  limit: number;
  reason: "subscriber" | "free" | "metered" | "premium";
};

function getMeterSecret(): string {
  const secret = process.env.PAYWALL_METER_SECRET || process.env.CLERK_SECRET_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PAYWALL_METER_SECRET must be configured in production.");
  }
  return "the-daily-post-local-paywall-meter-key";
}

function hashMeterIdentity(identity: string): string {
  return createHmac("sha256", getMeterSecret()).update(identity).digest("hex");
}

function getTrustedClientIp(requestHeaders: Headers): string {
  let headerName: string | null = null;

  // Vercel documents this platform-generated header as the client's public IP.
  // Prefer it over x-forwarded-for, which an upstream proxy may rewrite.
  if (process.env.VERCEL === "1") {
    headerName = "x-vercel-forwarded-for";
  } else if (process.env.PAYWALL_CLIENT_IP_HEADER?.trim()) {
    // Self-hosted production must opt into one header that its trusted edge
    // overwrites with a single client IP; never infer trust from XFF/X-Real-IP.
    headerName = process.env.PAYWALL_CLIENT_IP_HEADER.trim().toLowerCase();
  } else if (process.env.NODE_ENV !== "production") {
    // Local development and tests may use the ordinary proxy header.
    headerName = "x-forwarded-for";
  }

  if (!headerName) {
    throw new Error(
      "Guest article metering needs Vercel's trusted client-IP header or PAYWALL_CLIENT_IP_HEADER in production.",
    );
  }

  const value = requestHeaders.get(headerName)?.trim() ?? "";
  // Require a single canonical IP rather than guessing which part of a proxy
  // chain is trustworthy. The configured proxy must strip/overwrite this header.
  if (!value || value.includes(",") || isIP(value) === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing or invalid trusted client IP in ${headerName}.`);
    }
    return "local-development";
  }

  return value.toLowerCase();
}

function getAnonymousIdentity(requestHeaders: Headers): string {
  return `anonymous-ip:${getTrustedClientIp(requestHeaders)}`;
}

function currentMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}

function isSerializationConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2034"
  );
}

/**
 * Decide access before rendering any article body. Reads are recorded server-side
 * and keyed by an HMAC of the account id or a trusted anonymous client IP.
 * Only the HMAC is persisted; raw IP data is not stored.
 */
export async function getArticleAccess(options: {
  slug: string;
  isPremium: boolean;
  sessionUser: SessionUser | null;
  requestHeaders: Headers;
  now?: Date;
}): Promise<ArticleAccess> {
  const { slug, isPremium, sessionUser } = options;
  const now = options.now ?? new Date();
  const limit = FREE_LIMIT;

  const dbUser = sessionUser
    ? await db.user.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          role: true,
          subTier: true,
          subStatus: true,
          subExpiresAt: true,
          stripeSubscriptionId: true,
        },
      })
    : null;

  const effectiveRole = sessionUser?.role ?? dbUser?.role;
  const confirmedPayment = dbUser?.stripeSubscriptionId && effectiveRole !== "admin"
    ? await db.payment.findFirst({
        where: {
          userId: dbUser.id,
          provider: "stripe",
          status: "succeeded",
          stripeSubscriptionId: dbUser.stripeSubscriptionId,
        },
        select: { id: true },
      })
    : null;

  const subscription = dbUser
    ? {
        ...dbUser,
        role: effectiveRole,
        hasSuccessfulPayment: Boolean(confirmedPayment),
      }
    : null;

  if (hasPaidAccess(subscription, now)) {
    return {
      allowed: true,
      isSubscriber: true,
      readCount: 0,
      remaining: limit,
      limit,
      reason: "subscriber",
    };
  }

  if (isPremium) {
    return {
      allowed: false,
      isSubscriber: false,
      readCount: 0,
      remaining: limit,
      limit,
      reason: "premium",
    };
  }

  const month = currentMonth(now);
  const meterKeys = new Set<string>();
  if (sessionUser) meterKeys.add(hashMeterIdentity(`user:${sessionUser.id}`));
  meterKeys.add(hashMeterIdentity(getAnonymousIdentity(options.requestHeaders)));
  const keys = [...meterKeys];

  const runTransaction = (tx: Prisma.TransactionClient) =>
    (async (): Promise<ArticleAccess> => {
      const existingReads = await tx.articleMeterRead.findMany({
        where: { meterKey: { in: keys }, month },
        select: { articleSlug: true },
      });
      const readSlugs = new Set(existingReads.map((read) => read.articleSlug));

      // If a guest signs in on the same IP, merge that month's guest reads into
      // the account key. This prevents changing networks after login from
      // resetting a quota already consumed anonymously.
      if (keys.length > 1) {
        for (const articleSlug of readSlugs) {
          for (const meterKey of keys) {
            await tx.articleMeterRead.upsert({
              where: {
                meterKey_articleSlug_month: { meterKey, articleSlug, month },
              },
              create: { meterKey, articleSlug, month },
              update: {},
            });
          }
        }
      }

      if (readSlugs.has(slug)) {
        return {
          allowed: true,
          isSubscriber: false,
          readCount: readSlugs.size,
          remaining: Math.max(0, limit - readSlugs.size),
          limit,
          reason: "free",
        };
      }

      if (readSlugs.size >= limit) {
        return {
          allowed: false,
          isSubscriber: false,
          readCount: readSlugs.size,
          remaining: 0,
          limit,
          reason: "metered",
        };
      }

      for (const meterKey of keys) {
        await tx.articleMeterRead.upsert({
          where: {
            meterKey_articleSlug_month: { meterKey, articleSlug: slug, month },
          },
          create: { meterKey, articleSlug: slug, month },
          update: {},
        });
      }

      const readCount = readSlugs.size + 1;
      return {
        allowed: true,
        isSubscriber: false,
        readCount,
        remaining: Math.max(0, limit - readCount),
        limit,
        reason: "free",
      };
    })();

  // PostgreSQL serializable isolation keeps simultaneous requests from
  // consuming more than the monthly allowance. Retry serialization conflicts.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(runTransaction, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (attempt < 2 && isSerializationConflict(error)) continue;
      throw error;
    }
  }

  throw new Error("Could not safely check the monthly article allowance.");
}
