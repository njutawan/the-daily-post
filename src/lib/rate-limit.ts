import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

/**
 * Production rate limits are stored in Upstash Redis, so every Vercel
 * function instance shares the same counters. Local development may fall back
 * to an in-process limiter when Upstash credentials are not configured.
 */
export type RateLimitOptions = {
  max: number;
  windowMs: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export class RateLimitUnavailableError extends Error {
  constructor(message = "The distributed rate-limit service is unavailable.") {
    super(message);
    this.name = "RateLimitUnavailableError";
  }
}

type Bucket = {
  tokens: number;
  lastRefill: number;
};

type UpstashConfig = {
  url: string;
  token: string;
};

const localBuckets = new Map<string, Bucket>();
const MAX_LOCAL_BUCKETS = 10_000;
const distributedLimiters = new Map<string, Ratelimit>();
let redisClient: Redis | null = null;
let redisConfigKey = "";

/**
 * Return a best-effort client IP. On Vercel prefer its platform header; on a
 * self-hosted deployment, configure RATE_LIMIT_CLIENT_IP_HEADER to a header
 * overwritten by the trusted reverse proxy. The X-Forwarded-For fallback is
 * retained only for local development and legacy non-Vercel setups.
 */
export function getClientIp(req: Request): string {
  const trustedHeader = process.env.RATE_LIMIT_CLIENT_IP_HEADER?.trim();
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for") || "";
  const forwardedFor = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";

  if (process.env.VERCEL === "1") {
    const ip = vercelForwardedFor.split(",")[0]?.trim() || "";
    return isIP(ip) ? ip : "unknown";
  }

  if (trustedHeader) {
    const ip = req.headers.get(trustedHeader)?.trim() || "";
    return !ip.includes(",") && isIP(ip) ? ip : "unknown";
  }

  if (process.env.NODE_ENV !== "production") {
    const ip = (forwardedFor || realIp || vercelForwardedFor).split(",")[0]?.trim() || "";
    return isIP(ip) ? ip : "unknown";
  }

  return "unknown";
}

function getUpstashConfig(): UpstashConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url && !token) return null;
  if (!url || !token) {
    throw new RateLimitUnavailableError(
      "Both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required."
    );
  }

  return { url, token };
}

function getRedis(config: UpstashConfig): Redis {
  const key = `${config.url}:${config.token}`;
  if (!redisClient || redisConfigKey !== key) {
    redisClient = new Redis({ url: config.url, token: config.token });
    redisConfigKey = key;
    distributedLimiters.clear();
  }
  return redisClient;
}

function getDistributedLimiter(config: UpstashConfig, options: RateLimitOptions): Ratelimit {
  const key = `${options.max}:${options.windowMs}`;
  let limiter = distributedLimiters.get(key);
  if (!limiter) {
    const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));
    const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
    limiter = new Ratelimit({
      redis: getRedis(config),
      limiter: Ratelimit.slidingWindow(options.max, `${windowSeconds} s`),
      prefix: `the-daily-post:${environment}:rate-limit:${options.max}:${options.windowMs}`,
    });
    distributedLimiters.set(key, limiter);
  }
  return limiter;
}

function limitLocally(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (localBuckets.size > MAX_LOCAL_BUCKETS) {
    const oldest = [...localBuckets.entries()].sort(
      (a, b) => a[1].lastRefill - b[1].lastRefill
    );
    for (let i = 0; i < Math.ceil(oldest.length / 2); i++) {
      localBuckets.delete(oldest[i][0]);
    }
  }

  const bucketKey = `${key}:${options.max}:${options.windowMs}`;
  let bucket = localBuckets.get(bucketKey);
  if (!bucket) {
    bucket = { tokens: options.max, lastRefill: now };
    localBuckets.set(bucketKey, bucket);
  }

  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(
    options.max,
    bucket.tokens + (elapsed / options.windowMs) * options.max
  );
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return { ok: false, remaining: 0, resetAt: now + options.windowMs };
  }

  bucket.tokens -= 1;
  return {
    ok: true,
    remaining: Math.floor(bucket.tokens),
    resetAt: now + options.windowMs,
  };
}

function hashIdentifier(identifier: string): string {
  return createHash("sha256").update(identifier).digest("hex");
}

export async function rateLimitByKey(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  if (
    process.env.NODE_ENV === "production" &&
    (key === "ip:unknown" || key.startsWith("ip:unknown:"))
  ) {
    throw new RateLimitUnavailableError(
      "A trusted client-IP header is required for production rate limiting."
    );
  }

  let config: UpstashConfig | null;
  try {
    config = getUpstashConfig();
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    logger.warn({ err: error }, "[rate-limit] Upstash credentials are incomplete; using local limiter in development");
    config = null;
  }

  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new RateLimitUnavailableError(
        "Distributed rate limiting is not configured. Set the Upstash Redis REST credentials."
      );
    }
    return limitLocally(key, options);
  }

  try {
    const result = await getDistributedLimiter(config, options).limit(hashIdentifier(key));
    return {
      ok: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch (error) {
    logger.error({ err: error }, "[rate-limit] Upstash request failed");
    if (process.env.NODE_ENV === "production") {
      throw new RateLimitUnavailableError();
    }
    return limitLocally(key, options);
  }
}

/** IP-based rate limit (public endpoint). */
export async function rateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  return rateLimitByKey(`ip:${getClientIp(req)}`, options);
}

function rateLimitUnavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Rate limiting is temporarily unavailable. Please try again shortly.",
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Retry-After": "5",
      },
    }
  );
}

function rateLimitExceededResponse(result: RateLimitResult, options: RateLimitOptions): Response {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Too many requests. Please try again in a moment.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(options.max),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/** Convenience helper: a 429 response when limited, 503 when the global store is unavailable. */
export async function rateLimitResponse(
  req: Request,
  options: RateLimitOptions
): Promise<Response | null> {
  try {
    const result = await rateLimit(req, options);
    return result.ok ? null : rateLimitExceededResponse(result, options);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return rateLimitUnavailableResponse();
    }
    logger.error({ err: error }, "[rate-limit] unexpected failure");
    return rateLimitUnavailableResponse();
  }
}

/** Keyed rate-limit helper (e.g. combined IP + authenticated user). */
export async function rateLimitByKeyResponse(
  key: string,
  options: RateLimitOptions
): Promise<Response | null> {
  try {
    const result = await rateLimitByKey(key, options);
    return result.ok ? null : rateLimitExceededResponse(result, options);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return rateLimitUnavailableResponse();
    }
    logger.error({ err: error }, "[rate-limit] unexpected keyed limit failure");
    return rateLimitUnavailableResponse();
  }
}
