import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockTransaction, mockDb } = vi.hoisted(() => {
  const tx = {
    stripeWebhookEvent: { create: vi.fn() },
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  };
  const db = {
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { mockTransaction: tx, mockDb: db };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

import { processStripeWebhookEvent } from "./stripe-webhook";
import type { StripeWebhookEvent } from "./stripe-webhook";

const nowSeconds = Math.floor(Date.now() / 1000);
const monthEnd = nowSeconds + 30 * 24 * 60 * 60;

function subscriptionEvent(overrides: Partial<StripeWebhookEvent> = {}): StripeWebhookEvent {
  return {
    id: "evt_subscription_test",
    type: "customer.subscription.updated",
    created: nowSeconds,
    data: {
      object: {
        id: "sub_test_123",
        customer: "cus_test_123",
        status: "active",
        current_period_end: monthEnd,
        items: { data: [{ price: { id: "price_digital_monthly" } }] },
        metadata: { userId: "user_test_123" },
      },
    },
    ...overrides,
  };
}

function invoiceEvent(
  type: "invoice.payment_succeeded" | "invoice.payment_failed",
): StripeWebhookEvent {
  return {
    id: `evt_${type.replace(/\./g, "_")}`,
    type,
    created: nowSeconds,
    data: {
      object: {
        id: "in_test_123",
        customer: "cus_test_123",
        subscription: "sub_test_123",
        number: "INV-TEST-123",
        amount_paid: 499,
        amount_due: 499,
        currency: "usd",
        metadata: { userId: "user_test_123" },
        lines: {
          data: [{
            price: { id: "price_digital_monthly" },
            period: { end: monthEnd },
          }],
        },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STRIPE_PRICE_DIGITAL_MONTHLY", "price_digital_monthly");
  mockTransaction.stripeWebhookEvent.create.mockResolvedValue({});
  mockTransaction.user.findUnique.mockResolvedValue({
    id: "user_test_123",
    stripeStatusUpdatedAt: null,
    stripeSubscriptionId: null,
    subExpiresAt: null,
    subStatus: "active",
  });
  mockTransaction.user.updateMany.mockResolvedValue({ count: 1 });
  mockTransaction.payment.findUnique.mockResolvedValue(null);
  mockTransaction.payment.findFirst.mockResolvedValue(null);
  mockTransaction.payment.updateMany.mockResolvedValue({ count: 1 });
  mockTransaction.payment.create.mockResolvedValue({ id: "payment_created_1" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Stripe webhook state synchronization", () => {
  it("links an active subscription but does not grant access before invoice payment", async () => {
    const event = subscriptionEvent();

    await processStripeWebhookEvent(event);

    expect(mockDb.$transaction).toHaveBeenCalledOnce();
    expect(mockTransaction.stripeWebhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: event.id, type: event.type }),
    });
    expect(mockTransaction.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: "user_test_123",
        OR: [
          { stripeStatusUpdatedAt: null },
          { stripeStatusUpdatedAt: { lte: new Date(event.created * 1000) } },
        ],
      },
      data: {
        stripeCustomerId: "cus_test_123",
        stripeSubscriptionId: "sub_test_123",
        subCancelAtPeriodEnd: false,
      },
    });
    expect(mockTransaction.user.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subStatus: "active" }) }),
    );
  });

  it("grants active status and the paid-through date only after a successful invoice", async () => {
    mockTransaction.payment.findFirst.mockResolvedValue({ id: "payment_pending_1" });
    const event = invoiceEvent("invoice.payment_succeeded");

    await processStripeWebhookEvent(event);

    expect(mockTransaction.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "payment_pending_1" }),
      data: expect.objectContaining({
        status: "succeeded",
        provider: "stripe",
        stripeInvoiceId: "in_test_123",
        stripeSubscriptionId: "sub_test_123",
      }),
    }));
    expect(mockTransaction.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "user_test_123",
        OR: [
          { stripeStatusUpdatedAt: null },
          { stripeStatusUpdatedAt: { lte: new Date(event.created * 1000) } },
        ],
      },
      data: expect.objectContaining({
        subStatus: "active",
        subTier: "digital",
        subExpiresAt: new Date(monthEnd * 1000),
        stripeSubscriptionId: "sub_test_123",
        stripeCustomerId: "cus_test_123",
      }),
    }));
  });

  it("marks failed invoices delinquent without upgrading a free account", async () => {
    mockTransaction.payment.findFirst.mockResolvedValue({ id: "payment_pending_1" });
    const event = invoiceEvent("invoice.payment_failed");

    await processStripeWebhookEvent(event);

    expect(mockTransaction.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "failed", stripeInvoiceId: "in_test_123" }),
    }));
    const calls = mockTransaction.user.updateMany.mock.calls;
    const userState = calls[calls.length - 1][0].data as Record<string, unknown>;
    expect(userState.subStatus).toBe("past_due");
    expect(userState).not.toHaveProperty("subTier");
    expect(userState).not.toHaveProperty("subExpiresAt");
  });

  it("does not let a delayed older subscription event roll back newer state", async () => {
    mockTransaction.user.findUnique.mockResolvedValue({
      id: "user_test_123",
      stripeStatusUpdatedAt: new Date((nowSeconds + 60) * 1000),
      stripeSubscriptionId: "sub_newer_456",
      subExpiresAt: null,
    });

    await processStripeWebhookEvent(subscriptionEvent({ created: nowSeconds - 60 }));

    expect(mockTransaction.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user_test_123" },
      data: { stripeCustomerId: "cus_test_123" },
    });
    expect(mockTransaction.user.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ subStatus: "active" }) }),
    );
  });
});
