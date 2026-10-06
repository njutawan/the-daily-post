import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashUnsubscribeToken } from "@/lib/newsletter-tokens";

const { mockDb, mockRateLimit, mockSendUnsubscribeEmail } = vi.hoisted(() => ({
  mockDb: {
    subscriber: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockRateLimit: vi.fn(() => null),
  mockSendUnsubscribeEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/rate-limit", () => ({ rateLimitResponse: mockRateLimit }));
vi.mock("@/lib/email", () => ({ sendUnsubscribeEmail: mockSendUnsubscribeEmail }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { POST } from "./route";

function post(body: unknown) {
  return new NextRequest("https://news.example/api/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockReturnValue(null);
});

describe("newsletter unsubscribe API", () => {
  it("sends an opt-out confirmation link without revealing whether an email is subscribed", async () => {
    mockDb.subscriber.findUnique.mockResolvedValue({
      id: "subscriber-1",
      unsubscribedAt: null,
    });
    mockDb.subscriber.update.mockResolvedValue({ id: "subscriber-1" });
    mockSendUnsubscribeEmail.mockResolvedValue({
      ok: true,
      message: "Sent.",
      actionUrl: "https://news.example/unsubscribe?token=abc",
    });

    const response = await POST(post({ email: " Reader@Example.com " }));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: "If this address has a newsletter subscription, we'll email a secure unsubscribe link shortly.",
      unsubscribeUrl: "https://news.example/unsubscribe?token=abc",
    });
    expect(mockDb.subscriber.findUnique).toHaveBeenCalledWith({
      where: { email: "reader@example.com" },
    });
    expect(mockDb.subscriber.update).toHaveBeenCalledWith({
      where: { id: "subscriber-1" },
      data: { unsubscribeTokenHash: expect.any(String) },
    });
    expect(mockSendUnsubscribeEmail).toHaveBeenCalledWith(
      "reader@example.com",
      expect.any(String)
    );
    const [sentEmail, rawToken] = mockSendUnsubscribeEmail.mock.calls[0];
    expect(rawToken).not.toBe((mockDb.subscriber.update.mock.calls[0][0].data as { unsubscribeTokenHash: string }).unsubscribeTokenHash);
    expect((mockDb.subscriber.update.mock.calls[0][0].data as { unsubscribeTokenHash: string }).unsubscribeTokenHash)
      .toBe(hashUnsubscribeToken(rawToken));
    expect(sentEmail).toBe("reader@example.com");
  });

  it("returns the same generic response when the address is not subscribed", async () => {
    mockDb.subscriber.findUnique.mockResolvedValue(null);

    const response = await POST(post({ email: "unknown@example.com" }));

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(mockDb.subscriber.update).not.toHaveBeenCalled();
    expect(mockSendUnsubscribeEmail).not.toHaveBeenCalled();
  });

  it("confirms opt-out by a one-way token hash and revokes subscription verification", async () => {
    const token = "b".repeat(64);
    mockDb.subscriber.findUnique.mockResolvedValue({
      id: "subscriber-1",
      unsubscribedAt: null,
    });
    mockDb.subscriber.update.mockResolvedValue({ id: "subscriber-1" });

    const response = await POST(post({ token }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: "You have been unsubscribed from The Daily Post newsletters.",
    });
    expect(mockDb.subscriber.findUnique).toHaveBeenCalledWith({
      where: { unsubscribeTokenHash: hashUnsubscribeToken(token) },
    });
    expect(mockDb.subscriber.update).toHaveBeenCalledWith({
      where: { id: "subscriber-1" },
      data: {
        verified: false,
        verifyToken: null,
        unsubscribedAt: expect.any(Date),
      },
    });
  });

  it("does not mutate an address that is already unsubscribed", async () => {
    mockDb.subscriber.findUnique.mockResolvedValue({
      id: "subscriber-1",
      unsubscribedAt: new Date("2026-10-01T00:00:00.000Z"),
    });

    const response = await POST(post({ token: "c".repeat(64) }));

    expect(response.status).toBe(200);
    expect(mockDb.subscriber.update).not.toHaveBeenCalled();
  });

  it("rejects ambiguous or malformed requests before touching subscriber data", async () => {
    const both = await POST(post({ email: "reader@example.com", token: "d".repeat(64) }));
    const invalidToken = await POST(post({ token: "not-a-token" }));

    expect(both.status).toBe(422);
    expect(invalidToken.status).toBe(422);
    expect(mockDb.subscriber.findUnique).not.toHaveBeenCalled();
  });
});
