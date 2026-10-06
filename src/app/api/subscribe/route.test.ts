import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockDb, mockRateLimit, mockSendVerificationEmail } = vi.hoisted(() => ({
  mockDb: {
    subscriber: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
  mockRateLimit: vi.fn(() => null),
  mockSendVerificationEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/rate-limit", () => ({ rateLimitResponse: mockRateLimit }));
vi.mock("@/lib/email", () => ({ sendVerificationEmail: mockSendVerificationEmail }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { GET, POST } from "./route";

function request(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue(null);
});

describe("newsletter subscription API", () => {
  it("stores a pending signup and returns the working verification page link in development", async () => {
    mockDb.subscriber.findUnique.mockResolvedValue(null);
    mockDb.subscriber.create.mockResolvedValue({ id: "subscriber-1" });
    mockSendVerificationEmail.mockResolvedValue({
      ok: true,
      message: "Use the local link.",
      actionUrl: "https://news.example/verify?token=abc",
    });

    const response = await POST(
      request("https://news.example/api/subscribe", {
        email: " Reader@Example.com ",
        source: "newsletters",
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      verified: false,
      verificationUrl: "https://news.example/verify?token=abc",
    });
    expect(mockDb.subscriber.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "reader@example.com",
        source: "newsletters",
        verified: false,
        verifyToken: expect.any(String),
        unsubscribeTokenHash: expect.any(String),
        unsubscribedAt: null,
      }),
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "reader@example.com",
      expect.any(String),
      expect.any(String)
    );
  });

  it("returns an error when verification email delivery fails", async () => {
    mockDb.subscriber.findUnique.mockResolvedValue(null);
    mockDb.subscriber.create.mockResolvedValue({ id: "subscriber-1" });
    mockSendVerificationEmail.mockResolvedValue({
      ok: false,
      message: "Email delivery failed.",
    });

    const response = await POST(
      request("https://news.example/api/subscribe", { email: "reader@example.com" })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });

  it("restarts double opt-in when a previously unsubscribed reader signs up again", async () => {
    mockDb.subscriber.findUnique.mockResolvedValue({
      id: "subscriber-1",
      verified: true,
      unsubscribedAt: new Date("2026-10-01T00:00:00.000Z"),
    });
    mockDb.subscriber.update.mockResolvedValue({ id: "subscriber-1" });
    mockSendVerificationEmail.mockResolvedValue({ ok: true, message: "Sent." });

    const response = await POST(
      request("https://news.example/api/subscribe", { email: "reader@example.com" })
    );

    expect(response.status).toBe(200);
    expect(mockDb.subscriber.update).toHaveBeenCalledWith({
      where: { id: "subscriber-1" },
      data: expect.objectContaining({
        verified: false,
        verifyToken: expect.any(String),
        unsubscribeTokenHash: expect.any(String),
        unsubscribedAt: null,
      }),
    });
    expect(mockSendVerificationEmail).toHaveBeenCalledOnce();
  });

  it("confirms a token through the API route and does not expose the subscriber email", async () => {
    const verifyToken = "a".repeat(64);
    mockDb.subscriber.findFirst.mockResolvedValue({
      id: "subscriber-1",
      email: "reader@example.com",
      verified: false,
      unsubscribedAt: null,
    });
    mockDb.subscriber.update.mockResolvedValue({ id: "subscriber-1" });

    const response = await GET(
      request(`https://news.example/api/subscribe?verify=${verifyToken}`)
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message: "Subscription confirmed! Thanks for verifying your email.",
    });
    expect(mockDb.subscriber.findFirst).toHaveBeenCalledWith({
      where: { verifyToken },
    });
    expect(mockDb.subscriber.update).toHaveBeenCalledWith({
      where: { id: "subscriber-1" },
      data: { verified: true, verifyToken: null },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("counts only verified subscribers who have not unsubscribed", async () => {
    mockDb.subscriber.count.mockResolvedValue(7);

    const response = await GET(request("https://news.example/api/subscribe"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, count: 7 });
    expect(mockDb.subscriber.count).toHaveBeenCalledWith({
      where: { verified: true, unsubscribedAt: null },
    });
  });
});
