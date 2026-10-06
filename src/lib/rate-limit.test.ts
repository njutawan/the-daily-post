import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  rateLimit,
  rateLimitByKeyResponse,
  rateLimitResponse,
} from "@/lib/rate-limit";

// `@types/node` marks NODE_ENV as read-only; tests legitimately need to
// toggle it to exercise the production fail-closed paths, so use a
// writable view of process.env.
const env = process.env as Record<string, string | undefined>;

const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const originalRateLimitIpHeader = process.env.RATE_LIMIT_CLIENT_IP_HEADER;
const originalNodeEnv = process.env.NODE_ENV;
const originalVercel = process.env.VERCEL;

beforeEach(() => {
  // These tests exercise the local-development fallback regardless of the CI environment.
  env.NODE_ENV = "test";
  process.env.VERCEL = "";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.RATE_LIMIT_CLIENT_IP_HEADER;
});

afterAll(() => {
  if (originalUpstashUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;

  if (originalUpstashToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;

  if (originalRateLimitIpHeader === undefined) delete process.env.RATE_LIMIT_CLIENT_IP_HEADER;
  else process.env.RATE_LIMIT_CLIENT_IP_HEADER = originalRateLimitIpHeader;

  if (originalNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = originalNodeEnv;

  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

// Helper: create a mock Request with an IP header.
function makeReq(ip: string): Request {
  return new Request("https://example.com/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimit", () => {
  it("allows requests up to the limit", async () => {
    const req = makeReq("1.2.3.4");
    const opts = { max: 5, windowMs: 60_000 };

    for (let i = 0; i < 5; i++) {
      const result = await rateLimit(req, opts);
      expect(result.ok).toBe(true);
    }
  });

  it("blocks requests exceeding the limit", async () => {
    const req = makeReq("5.6.7.8");
    const opts = { max: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(req, opts);
      expect(result.ok).toBe(true);
    }

    const blocked = await rateLimit(req, opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks remaining count correctly", async () => {
    const req = makeReq("9.10.11.12");
    const opts = { max: 4, windowMs: 60_000 };

    const r1 = await rateLimit(req, opts);
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(3);

    const r2 = await rateLimit(req, opts);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(2);
  });

  it("isolates rate limits by IP", async () => {
    const req1 = makeReq("100.200.1.1");
    const req2 = makeReq("100.200.2.2");
    const opts = { max: 2, windowMs: 60_000 };

    await rateLimit(req1, opts);
    await rateLimit(req1, opts);
    const ip1Blocked = await rateLimit(req1, opts);
    expect(ip1Blocked.ok).toBe(false);

    const ip2Result = await rateLimit(req2, opts);
    expect(ip2Result.ok).toBe(true);
  });

  it("returns HTTP 429 when a local-development limit is exceeded", async () => {
    const req = makeReq("198.51.100.44");
    const opts = { max: 1, windowMs: 60_000 };

    expect(await rateLimitResponse(req, opts)).toBeNull();
    const blocked = await rateLimitResponse(req, opts);
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).toBeTruthy();
  });

  it("fails closed with HTTP 503 when production Redis credentials are absent", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    env.NODE_ENV = "production";

    try {
      const response = await rateLimitByKeyResponse("production-test", {
        max: 1,
        windowMs: 60_000,
      });
      expect(response?.status).toBe(503);
    } finally {
      if (originalNodeEnv === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = originalNodeEnv;
    }
  });

  it("fails closed when production has no trusted client-IP source", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    env.NODE_ENV = "production";
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    try {
      const response = await rateLimitResponse(makeReq("203.0.113.10"), {
        max: 1,
        windowMs: 60_000,
      });
      expect(response?.status).toBe(503);
    } finally {
      if (originalNodeEnv === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = originalNodeEnv;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  });
});
