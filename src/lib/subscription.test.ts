import { describe, expect, it } from "vitest";
import {
  hasPaidAccess,
  isSubscriptionInGoodStanding,
  mapStripeSubscriptionStatus,
  type SubscriptionState,
} from "./subscription";

const now = new Date("2026-10-06T00:00:00.000Z");
const currentPeriodEnd = new Date("2026-11-06T00:00:00.000Z");

function subscription(overrides: Partial<SubscriptionState> = {}) {
  return {
    role: "reader",
    subTier: "digital",
    subStatus: "active",
    subExpiresAt: currentPeriodEnd,
    stripeSubscriptionId: "sub_test_123",
    hasSuccessfulPayment: true,
    ...overrides,
  };
}

describe("Stripe-backed subscription entitlement", () => {
  it("grants access only to a current Stripe subscription", () => {
    expect(hasPaidAccess(subscription(), now)).toBe(true);
  });

  it("keeps scheduled-cancellation access through the paid-through date", () => {
    expect(hasPaidAccess(subscription({ subStatus: "canceled" }), now)).toBe(true);
  });

  it("does not trust legacy mock subscriptions or missing billing dates", () => {
    expect(hasPaidAccess(subscription({ stripeSubscriptionId: null }), now)).toBe(false);
    expect(hasPaidAccess(subscription({ hasSuccessfulPayment: false }), now)).toBe(false);
    expect(hasPaidAccess(subscription({ subExpiresAt: null }), now)).toBe(false);
    expect(hasPaidAccess(subscription({ subStatus: "past_due" }), now)).toBe(false);
  });

  it("expires subscriptions at the period end and allows administrators", () => {
    expect(hasPaidAccess(subscription(), currentPeriodEnd)).toBe(false);
    expect(hasPaidAccess(subscription({ role: "admin", stripeSubscriptionId: null }), now)).toBe(true);
  });

  it("maps Stripe cancellation and delinquency responses without granting false access", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("active");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("pending");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("canceled");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("past_due");
    expect(mapStripeSubscriptionStatus("incomplete")).toBe("pending");
  });

  it("distinguishes active billing accounts from free accounts", () => {
    expect(isSubscriptionInGoodStanding(subscription(), now)).toBe(true);
    expect(isSubscriptionInGoodStanding(subscription({ subStatus: "expired" }), now)).toBe(false);
  });
});
