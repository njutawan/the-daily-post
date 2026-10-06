import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockDb, mockStripeRequest } = vi.hoisted(() => ({
  mockDb: { user: { findUnique: vi.fn(), update: vi.fn() } },
  mockStripeRequest: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/stripe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stripe")>();
  return { ...actual, stripeRequest: mockStripeRequest };
});

import { cancelStripeSubscription } from "./billing";

const paidThrough = new Date("2026-11-06T00:00:00.000Z");

describe("Stripe subscription cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.user.findUnique.mockResolvedValue({
      stripeSubscriptionId: "sub_test_123",
      subTier: "digital",
      subStatus: "past_due",
      subExpiresAt: paidThrough,
    });
    mockDb.user.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("preserves Stripe delinquency instead of accidentally reactivating access", async () => {
    mockStripeRequest.mockResolvedValue({
      id: "sub_test_123",
      status: "past_due",
      cancel_at_period_end: true,
      current_period_end: Math.floor(paidThrough.getTime() / 1000),
    });

    const result = await cancelStripeSubscription({ userId: "user_test_123", immediate: false });

    expect(result.status).toBe("past_due");
    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(mockDb.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        subStatus: "past_due",
        subCancelAtPeriodEnd: true,
        subExpiresAt: paidThrough,
      }),
    }));
  });
});
