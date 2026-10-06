import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStripeTestSignature,
  getPlanForStripePrice,
  getStripePlan,
  getStripeSiteUrl,
  verifyStripeWebhookSignature,
} from "./stripe";

const WEBHOOK_SECRET = "whsec_test_secret";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Stripe webhook signatures", () => {
  it("accepts a valid signature for the exact raw request body", () => {
    const rawBody = JSON.stringify({ id: "evt_1", type: "invoice.payment_succeeded" });
    const timestamp = 1_800_000_000;
    const signature = createStripeTestSignature(rawBody, WEBHOOK_SECRET, timestamp);

    expect(verifyStripeWebhookSignature(rawBody, signature, WEBHOOK_SECRET, timestamp)).toBe(true);
  });

  it("rejects a tampered payload and an invalid signature", () => {
    const rawBody = "{\"id\":\"evt_1\"}";
    const signature = createStripeTestSignature(rawBody, WEBHOOK_SECRET, 1_800_000_000);

    expect(verifyStripeWebhookSignature(`${rawBody} `, signature, WEBHOOK_SECRET, 1_800_000_000)).toBe(false);
    expect(verifyStripeWebhookSignature(rawBody, signature, "wrong-secret", 1_800_000_000)).toBe(false);
  });

  it("rejects signatures outside the replay-protection time tolerance", () => {
    const rawBody = "{}";
    const timestamp = 1_800_000_000;
    const signature = createStripeTestSignature(rawBody, WEBHOOK_SECRET, timestamp);

    expect(verifyStripeWebhookSignature(rawBody, signature, WEBHOOK_SECRET, timestamp + 301)).toBe(false);
  });

  it("supports Stripe's multiple v1 signatures during secret rotation", () => {
    const rawBody = "{\"data\":{}}";
    const timestamp = 1_800_000_000;
    const valid = createStripeTestSignature(rawBody, WEBHOOK_SECRET, timestamp).split(",")[1];

    expect(
      verifyStripeWebhookSignature(
        rawBody,
        `t=${timestamp},v1=${"0".repeat(64)},${valid}`,
        WEBHOOK_SECRET,
        timestamp,
      ),
    ).toBe(true);
  });
});

describe("Stripe plan and return URL configuration", () => {
  it("maps a configured Stripe Price ID to its plan", () => {
    vi.stubEnv("STRIPE_PRICE_DIGITAL_MONTHLY", "price_digital_monthly");
    vi.stubEnv("STRIPE_PRICE_DIGITAL_ANNUAL", "price_digital_annual");
    vi.stubEnv("STRIPE_PRICE_ALLACCESS_MONTHLY", "price_allaccess_monthly");

    expect(getPlanForStripePrice("price_digital_annual")).toMatchObject({
      id: "digital-annual",
      tier: "digital",
      billingCycle: "annual",
    });
    expect(getStripePlan("missing-plan")).toBeNull();
    expect(getStripePlan("__proto__")).toBeNull();
  });

  it("uses a request origin only for local development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getStripeSiteUrl("http://localhost:3000/path")).toBe("http://localhost:3000");
  });

  it("requires an explicit HTTPS return URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(() => getStripeSiteUrl("https://attacker.example")).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});
