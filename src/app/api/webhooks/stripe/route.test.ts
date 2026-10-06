import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createStripeTestSignature } from "@/lib/stripe";

const { mockProcessEvent, mockDb } = vi.hoisted(() => ({
  mockProcessEvent: vi.fn(),
  mockDb: { stripeWebhookEvent: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/stripe-webhook", () => ({ processStripeWebhookEvent: mockProcessEvent }));

import { POST } from "./route";

const secret = "whsec_test_secret";
const timestamp = Math.floor(Date.now() / 1000);
const rawBody = JSON.stringify({
  id: "evt_test_123",
  type: "invoice.payment_succeeded",
  created: timestamp,
  data: { object: { id: "in_test_123" } },
});

function request(body: string, signature?: string) {
  return new NextRequest("https://news.example/api/webhooks/stripe", {
    method: "POST",
    headers: signature ? { "stripe-signature": signature } : {},
    body,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("Stripe webhook HTTP handler", () => {
  it("rejects unsigned and tampered webhook requests", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);

    const unsigned = await POST(request(rawBody));
    const invalid = await POST(request(rawBody, "t=1800000000,v1=invalid"));

    expect(unsigned.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(mockProcessEvent).not.toHaveBeenCalled();
  });

  it("passes only a valid signed event to the idempotent processor", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    const signature = createStripeTestSignature(rawBody, secret, timestamp);

    const response = await POST(request(rawBody, signature));

    expect(response.status).toBe(200);
    expect(mockProcessEvent).toHaveBeenCalledWith({
      id: "evt_test_123",
      type: "invoice.payment_succeeded",
      created: timestamp,
      data: { object: { id: "in_test_123" } },
    });
  });

  it("acknowledges a retried event only when its id was already committed", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    mockProcessEvent.mockRejectedValue(new Error("duplicate event id"));
    mockDb.stripeWebhookEvent.findUnique.mockResolvedValue({ id: "evt_test_123" });
    const signature = createStripeTestSignature(rawBody, secret, timestamp);

    const response = await POST(request(rawBody, signature));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true, duplicate: true });
  });

  it("rejects oversized bodies before attempting event processing", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    const response = await POST(request("x".repeat(1_000_001), "irrelevant"));
    const declaredTooLarge = await POST(new NextRequest("https://news.example/api/webhooks/stripe", {
      method: "POST",
      headers: { "content-length": "1000001" },
      body: "{}",
    }));

    expect(response.status).toBe(413);
    expect(declaredTooLarge.status).toBe(413);
    expect(mockProcessEvent).not.toHaveBeenCalled();
  });
});
