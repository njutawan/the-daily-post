import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

// Helper: create a mock Request with an IP header
function makeReq(ip: string): Request {
  return new Request("https://example.com/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const req = makeReq("1.2.3.4");
    // Use a unique key by varying max/window to avoid cross-test contamination
    const opts = { max: 5, windowMs: 60000 };

    for (let i = 0; i < 5; i++) {
      const result = rateLimit(req, opts);
      expect(result.ok).toBe(true);
    }
  });

  it("blocks requests exceeding the limit", () => {
    const req = makeReq("5.6.7.8");
    const opts = { max: 3, windowMs: 60000 };

    // First 3 pass
    for (let i = 0; i < 3; i++) {
      const result = rateLimit(req, opts);
      expect(result.ok).toBe(true);
    }
    // 4th is blocked
    const blocked = rateLimit(req, opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks remaining count correctly", () => {
    const req = makeReq("9.10.11.12");
    const opts = { max: 4, windowMs: 60000 };

    const r1 = rateLimit(req, opts);
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(3);

    const r2 = rateLimit(req, opts);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(2);
  });

  it("isolates rate limits by IP", () => {
    const req1 = makeReq("100.200.1.1");
    const req2 = makeReq("100.200.2.2");
    const opts = { max: 2, windowMs: 60000 };

    // Exhaust IP 1
    rateLimit(req1, opts);
    rateLimit(req1, opts);
    const ip1Blocked = rateLimit(req1, opts);
    expect(ip1Blocked.ok).toBe(false);

    // IP 2 should still have tokens
    const ip2Result = rateLimit(req2, opts);
    expect(ip2Result.ok).toBe(true);
  });
});
