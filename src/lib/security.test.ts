import { describe, expect, it, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { assertSafeUrl, verifyOrigin } from "@/lib/security";

function request(method: string, headers: Record<string, string> = {}, url = "https://news.example/api") {
  return new NextRequest(url, { method, headers });
}

describe("verifyOrigin", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("allows read-only methods without origin headers", () => {
    expect(verifyOrigin(request("GET"))).toBe(true);
  });

  it("accepts the configured site origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://daily.example";
    expect(
      verifyOrigin(request("POST", { origin: "https://daily.example" })),
    ).toBe(true);
  });

  it("accepts the request host and Vercel preview origins", () => {
    expect(
      verifyOrigin(request("PATCH", {
        host: "news.example",
        origin: "https://news.example",
      })),
    ).toBe(true);
    expect(
      verifyOrigin(request("DELETE", {
        host: "news.example",
        origin: "https://preview-123.vercel.app",
      })),
    ).toBe(true);
  });

  it("falls back to a same-site referer when origin is absent", () => {
    expect(
      verifyOrigin(request("POST", {
        host: "news.example",
        referer: "https://news.example/article/story",
      })),
    ).toBe(true);
  });

  it("rejects cross-site and malformed origins", () => {
    expect(
      verifyOrigin(request("POST", {
        host: "news.example",
        origin: "https://attacker.example",
      })),
    ).toBe(false);
    expect(
      verifyOrigin(request("POST", {
        host: "news.example",
        origin: "not a url",
      })),
    ).toBe(false);
  });

  it("bypasses origin checks only for webhook paths when requested", () => {
    expect(
      verifyOrigin(
        request("POST", { origin: "https://attacker.example" }, "https://news.example/api/webhook"),
        { skipWebhook: true },
      ),
    ).toBe(true);
    expect(
      verifyOrigin(
        request("POST", { origin: "https://attacker.example" }, "https://news.example/api/payments"),
        { skipWebhook: true },
      ),
    ).toBe(false);
  });
});

describe("assertSafeUrl", () => {
  it.each([
    "http://localhost:8080/health",
    "https://127.0.0.1/admin",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5/internal",
    "http://[::1]/",
  ])("blocks internal URL %s", (url) => {
    expect(() => assertSafeUrl(url)).toThrow();
  });

  it("blocks unsupported protocols and malformed URLs", () => {
    expect(() => assertSafeUrl("file:///etc/passwd")).toThrow(/Blocked protocol/);
    expect(() => assertSafeUrl("not a url")).toThrow(/Invalid URL format/);
  });

  it("enforces an explicit host allowlist", () => {
    expect(() => assertSafeUrl("https://cdn.example/image.jpg", ["api.example"])).toThrow(
      /Host not in allowlist/,
    );
    expect(() => assertSafeUrl("https://cdn.example/image.jpg", ["cdn.example"])).not.toThrow();
  });
});
