/**
 * Rate limiter — prevents spam/abuse by capping requests per IP + user.
 *
 * Two modes:
 *   1. rateLimit(req, { max, windowMs }) — IP-based (for public endpoints)
 *   2. rateLimitByKey(key, { max, windowMs }) — custom key (e.g., ip + userId)
 *
 * The rateLimitByIpAndUser() helper combines both: anonymous users are
 * limited by IP, authenticated users by userId (so one user can't bypass
 * the limit by rotating IPs, and one IP can't bypass by creating
 * multiple accounts).
 *
 * Uses an in-memory sliding-window token bucket. On Vercel serverless,
 * each isolate has its own map — the limit is per-isolate, not global.
 * For strict global limits in production, replace the `buckets` Map with
 * @upstash/ratelimit + Redis (see https://github.com/upstash/ratelimit).
 */

type Bucket = {
  tokens: number;
  lastRefill: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/** Extract the client IP from standard proxy headers. */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const vercelFwd = req.headers.get("x-vercel-forwarded-for") || "";
  return (
    fwd.split(",")[0].trim() ||
    realIp.trim() ||
    vercelFwd.split(",")[0].trim() ||
    "unknown"
  );
}

/**
 * Core rate-limit check using a custom key. Use this when you want to
 * limit by user ID, IP+user, or any other composite key.
 */
export function rateLimitByKey(
  key: string,
  opts: RateLimitOptions
): RateLimitResult {
  const now = Date.now();

  // Periodic cleanup: trim oldest buckets if map is too large.
  if (buckets.size > MAX_BUCKETS) {
    const sorted = [...buckets.entries()].sort(
      (a, b) => a[1].lastRefill - b[1].lastRefill
    );
    for (let i = 0; i < sorted.length / 2; i++) {
      buckets.delete(sorted[i][0]);
    }
  }

  const bucketKey = `${key}:${opts.max}:${opts.windowMs}`;
  let bucket = buckets.get(bucketKey);
  if (!bucket) {
    bucket = { tokens: opts.max, lastRefill: now };
    buckets.set(bucketKey, bucket);
  }

  // Refill tokens based on elapsed time (sliding window).
  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / opts.windowMs) * opts.max;
  bucket.tokens = Math.min(opts.max, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return { ok: false, remaining: 0, resetAt: now + opts.windowMs };
  }

  bucket.tokens -= 1;
  return {
    ok: true,
    remaining: Math.floor(bucket.tokens),
    resetAt: now + opts.windowMs,
  };
}

/**
 * IP-based rate limit (original API, backwards-compatible).
 * Use for public endpoints that don't require authentication.
 */
export function rateLimit(req: Request, opts: RateLimitOptions): RateLimitResult {
  const ip = getClientId(req);
  return rateLimitByKey(`ip:${ip}`, opts);
}

/** @deprecated Use getClientIp() instead. */
function getClientId(req: Request): string {
  return getClientIp(req);
}

/**
 * Convenience helper: returns a 429 Response if rate-limited, null otherwise.
 */
export function rateLimitResponse(
  req: Request,
  opts: RateLimitOptions
): Response | null {
  const result = rateLimit(req, opts);
  if (result.ok) return null;
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Too many requests. Please try again in a moment.",
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(
          Math.ceil((result.resetAt - Date.now()) / 1000)
        ),
      },
    }
  );
}

/**
 * Convenience helper for key-based rate limiting.
 * Returns a 429 Response if rate-limited, null otherwise.
 */
export function rateLimitByKeyResponse(
  key: string,
  opts: RateLimitOptions
): Response | null {
  const result = rateLimitByKey(key, opts);
  if (result.ok) return null;
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Too many requests. Please try again in a moment.",
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(
          Math.ceil((result.resetAt - Date.now()) / 1000)
        ),
      },
    }
  );
}
