import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { mapStripeSubscriptionStatus } from "@/lib/subscription";
import { getPlanForStripePrice, getStripePlan, type StripePlan } from "@/lib/stripe";
import { logger } from "@/lib/logger";

export type StripeWebhookEvent = {
  id: string;
  type: string;
  created: number;
  data: { object: Record<string, unknown> };
};

type JsonRecord = Record<string, unknown>;
type Transaction = Prisma.TransactionClient;

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stripeObjectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  return stringValue(asRecord(value).id);
}

function metadataOf(value: unknown): Record<string, string> {
  const metadata = asRecord(asRecord(value).metadata);
  return Object.fromEntries(
    Object.entries(metadata).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function unixDate(seconds: number | null): Date | null {
  if (seconds === null || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventDate(event: StripeWebhookEvent): Date {
  return unixDate(event.created) ?? new Date();
}

function getInvoicePriceId(invoice: JsonRecord): string | null {
  const lines = asRecord(invoice.lines);
  const data = Array.isArray(lines.data) ? lines.data : [];
  for (const item of data) {
    const row = asRecord(item);
    const priceId = stripeObjectId(row.price);
    if (priceId) return priceId;
    const pricing = asRecord(row.pricing);
    const details = asRecord(pricing.price_details);
    const nestedId = stripeObjectId(details.price);
    if (nestedId) return nestedId;
  }
  return null;
}

function planFromMetadata(metadata: Record<string, string>): StripePlan | null {
  const planId = metadata.planId;
  return planId ? getStripePlan(planId) : null;
}

function getInvoiceContext(invoice: JsonRecord): {
  customerId: string | null;
  subscriptionId: string | null;
  metadata: Record<string, string>;
  periodEnd: Date | null;
  priceId: string | null;
} {
  const parent = asRecord(invoice.parent);
  const parentDetails = asRecord(parent.subscription_details);
  const topLevelDetails = asRecord(invoice.subscription_details);
  const metadata = {
    ...metadataOf(invoice),
    ...metadataOf({ metadata: parentDetails.metadata }),
    ...metadataOf({ metadata: topLevelDetails.metadata }),
  };
  const lineRows = Array.isArray(asRecord(invoice.lines).data)
    ? asRecord(invoice.lines).data as unknown[]
    : [];
  const periodEnds = lineRows
    .map((line) => numberValue(asRecord(asRecord(line).period).end))
    .filter((value): value is number => value !== null);

  return {
    customerId: stripeObjectId(invoice.customer),
    subscriptionId:
      stripeObjectId(invoice.subscription) ||
      stripeObjectId(parentDetails.subscription) ||
      stripeObjectId(topLevelDetails.subscription),
    metadata,
    periodEnd: unixDate(periodEnds.length > 0 ? Math.max(...periodEnds) : null),
    priceId: getInvoicePriceId(invoice),
  };
}

async function findUserId(
  tx: Transaction,
  metadata: Record<string, string>,
  customerId: string | null,
): Promise<string | null> {
  const metadataUserId = metadata.userId;
  if (metadataUserId) {
    const user = await tx.user.findUnique({ where: { id: metadataUserId }, select: { id: true } });
    if (user) return user.id;
  }

  if (customerId) {
    const user = await tx.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (user) return user.id;
  }

  return null;
}

function isNewerEvent(existing: Date | null, incoming: Date): boolean {
  return !existing || incoming.getTime() >= existing.getTime();
}

async function applySubscriptionState(
  tx: Transaction,
  event: StripeWebhookEvent,
  subscription: JsonRecord,
): Promise<void> {
  const customerId = stripeObjectId(subscription.customer);
  const subscriptionId = stripeObjectId(subscription.id);
  const metadata = metadataOf(subscription);
  const userId = await findUserId(tx, metadata, customerId);
  if (!userId || !subscriptionId) {
    throw new Error("Stripe subscription event could not be matched to an account.");
  }

  const existingUser = await tx.user.findUnique({
    where: { id: userId },
    select: { stripeStatusUpdatedAt: true, subExpiresAt: true },
  });
  const incomingAt = eventDate(event);
  const rawStatus = stringValue(subscription.status) || "incomplete";
  const mappedStatus = mapStripeSubscriptionStatus(rawStatus);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;

  if (!isNewerEvent(existingUser?.stripeStatusUpdatedAt ?? null, incomingAt)) {
    await tx.user.updateMany({
      where: { id: userId },
      data: { stripeCustomerId: customerId || undefined },
    });
    return;
  }

  const freshnessGuard = {
    id: userId,
    OR: [
      { stripeStatusUpdatedAt: null },
      { stripeStatusUpdatedAt: { lte: incomingAt } },
    ],
  };
  const linkage: Record<string, unknown> = {
    stripeCustomerId: customerId || undefined,
    stripeSubscriptionId: subscriptionId,
    subCancelAtPeriodEnd: cancelAtPeriodEnd,
  };

  // Subscription status alone does not prove payment. Active/trialing updates
  // may link the Stripe subscription, but only invoice.payment_succeeded can
  // set paid tier, paid-through date, or active entitlement.
  if (mappedStatus === "active") {
    // Link the subscription, but do not change entitlement or paid-through
    // status here. A successful invoice is the only event that grants access.
    const applied = await tx.user.updateMany({ where: freshnessGuard, data: linkage });
    if (applied.count === 0) {
      await tx.user.updateMany({
        where: { id: userId },
        data: { stripeCustomerId: customerId || undefined },
      });
    }
    return;
  }

  const state: Record<string, unknown> = {
    ...linkage,
    subStatus: mappedStatus,
    stripeStatusUpdatedAt: incomingAt,
  };
  if (rawStatus === "canceled") {
    const endedAt =
      unixDate(numberValue(subscription.ended_at)) ||
      unixDate(numberValue(subscription.canceled_at));
    const paidThrough = existingUser?.subExpiresAt ?? null;
    if (endedAt && paidThrough) {
      state.subExpiresAt = new Date(Math.min(endedAt.getTime(), paidThrough.getTime()));
    } else if (endedAt || paidThrough) {
      state.subExpiresAt = endedAt || paidThrough;
    }
  }

  const applied = await tx.user.updateMany({ where: freshnessGuard, data: state });
  // Re-check freshness in the database as part of the write. A second webhook
  // may have committed after the earlier read; never let that race roll back a
  // more recent Stripe status.
  if (applied.count === 0) {
    await tx.user.updateMany({
      where: { id: userId },
      data: { stripeCustomerId: customerId || undefined },
    });
    return;
  }

  const paymentId = metadata.paymentId;
  if (paymentId) {
    await tx.payment.updateMany({
      where: { id: paymentId, userId },
      data: { stripeSubscriptionId: subscriptionId },
    });
  }
}

async function resolveInvoicePlan(
  invoice: JsonRecord,
  metadata: Record<string, string>,
): Promise<StripePlan> {
  const plan = getPlanForStripePrice(getInvoicePriceId(invoice) || "") || planFromMetadata(metadata);
  if (!plan) throw new Error("Stripe invoice did not contain a configured subscription price.");
  return plan;
}

async function recordInvoicePayment(
  tx: Transaction,
  event: StripeWebhookEvent,
  invoice: JsonRecord,
  status: "succeeded" | "failed",
): Promise<void> {
  const context = getInvoiceContext(invoice);
  const userId = await findUserId(tx, context.metadata, context.customerId);
  const invoiceId = stringValue(invoice.id);
  if (!userId || !invoiceId) {
    throw new Error("Stripe invoice event could not be matched to an account.");
  }

  const plan = await resolveInvoicePlan(invoice, context.metadata);
  const amount = status === "succeeded"
    ? numberValue(invoice.amount_paid) ?? numberValue(invoice.total) ?? 0
    : numberValue(invoice.amount_due) ?? numberValue(invoice.total) ?? 0;
  const currency = (stringValue(invoice.currency) || plan.currency).toUpperCase();
  const invoiceLabel = stringValue(invoice.number) || invoiceId;
  const subscriptionId = context.subscriptionId || context.metadata.subscriptionId || null;
  const incomingAt = eventDate(event);
  const paymentData = {
    amount: Math.max(0, Math.round(amount)),
    currency,
    tier: plan.tier,
    billingCycle: plan.billingCycle,
    status,
    provider: "stripe",
    providerInvoice: invoiceLabel,
    stripeInvoiceId: invoiceId,
    stripeSubscriptionId: subscriptionId,
    invoicePdfUrl: stringValue(invoice.invoice_pdf),
    hostedInvoiceUrl: stringValue(invoice.hosted_invoice_url),
    stripeStatusUpdatedAt: incomingAt,
  };

  const existingInvoice = await tx.payment.findUnique({ where: { stripeInvoiceId: invoiceId } });
  if (existingInvoice) {
    await tx.payment.updateMany({
      where: {
        id: existingInvoice.id,
        OR: [
          { stripeStatusUpdatedAt: null },
          { stripeStatusUpdatedAt: { lte: incomingAt } },
        ],
      },
      data: paymentData,
    });
  } else {
    const metadataPaymentId = context.metadata.paymentId;
    const pendingPayment = metadataPaymentId
      ? await tx.payment.findFirst({
          where: { id: metadataPaymentId, userId, status: "pending", provider: "stripe" },
        })
      : await tx.payment.findFirst({
          where: {
            userId,
            status: "pending",
            provider: "stripe",
            tier: plan.tier,
            billingCycle: plan.billingCycle,
          },
          orderBy: { createdAt: "desc" },
        });

    if (pendingPayment) {
      await tx.payment.updateMany({
        where: {
          id: pendingPayment.id,
          OR: [
            { stripeStatusUpdatedAt: null },
            { stripeStatusUpdatedAt: { lte: incomingAt } },
          ],
        },
        data: paymentData,
      });
    } else {
      await tx.payment.create({
        data: { userId, ...paymentData },
      });
    }
  }

  const state: Record<string, unknown> = {
    subStatus: status === "succeeded" ? "active" : "past_due",
    stripeStatusUpdatedAt: incomingAt,
  };
  if (status === "succeeded") state.subTier = plan.tier;
  if (status === "succeeded" && context.periodEnd) state.subExpiresAt = context.periodEnd;
  if (subscriptionId) state.stripeSubscriptionId = subscriptionId;
  if (context.customerId) state.stripeCustomerId = context.customerId;
  if (status === "succeeded") state.subCancelAtPeriodEnd = false;

  await tx.user.updateMany({
    where: {
      id: userId,
      OR: [
        { stripeStatusUpdatedAt: null },
        { stripeStatusUpdatedAt: { lte: incomingAt } },
      ],
    },
    data: state,
  });
}

export async function processStripeWebhookEvent(event: StripeWebhookEvent): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.stripeWebhookEvent.create({
      data: {
        id: event.id,
        type: event.type,
        processedAt: eventDate(event),
      },
    });

    const object = event.data.object;
    switch (event.type) {
      case "checkout.session.completed": {
        const metadata = metadataOf(object);
        const customerId = stripeObjectId(object.customer);
        const subscriptionId = stripeObjectId(object.subscription);
        const userId = await findUserId(tx, metadata, customerId);
        if (!userId) throw new Error("Completed Checkout Session could not be matched to an account.");

        const existingUser = await tx.user.findUnique({
          where: { id: userId },
          select: { stripeStatusUpdatedAt: true },
        });
        const incomingAt = eventDate(event);
        const sessionIsStale = !isNewerEvent(existingUser?.stripeStatusUpdatedAt ?? null, incomingAt);
        const customerLinkage: Record<string, unknown> = {
          stripeCustomerId: customerId || undefined,
        };
        if (!sessionIsStale) {
          customerLinkage.stripeSubscriptionId = subscriptionId || undefined;
          const applied = await tx.user.updateMany({
            where: {
              id: userId,
              OR: [
                { stripeStatusUpdatedAt: null },
                { stripeStatusUpdatedAt: { lte: incomingAt } },
              ],
            },
            data: customerLinkage,
          });
          if (applied.count === 0) {
            await tx.user.updateMany({
              where: { id: userId },
              data: { stripeCustomerId: customerId || undefined },
            });
          }
        } else {
          await tx.user.updateMany({
            where: { id: userId },
            data: { stripeCustomerId: customerId || undefined },
          });
        }

        if (metadata.paymentId) {
          await tx.payment.updateMany({
            where: { id: metadata.paymentId, userId },
            data: {
              stripeCheckoutSessionId: stringValue(object.id),
              stripeSubscriptionId: subscriptionId,
              providerInvoice: stringValue(object.id),
            },
          });
        }
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const metadata = metadataOf(object);
        const paymentId = metadata.paymentId;
        const sessionId = stringValue(object.id);
        await tx.payment.updateMany({
          where: {
            provider: "stripe",
            status: "pending",
            OR: [
              ...(paymentId ? [{ id: paymentId }] : []),
              ...(sessionId ? [{ stripeCheckoutSessionId: sessionId }] : []),
            ],
          },
          data: { status: "failed" },
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscriptionState(tx, event, object);
        break;

      case "invoice.payment_succeeded":
        await recordInvoicePayment(tx, event, object, "succeeded");
        break;

      case "invoice.payment_failed":
        await recordInvoicePayment(tx, event, object, "failed");
        break;

      default:
        // Store unknown event ids too, so Stripe retries do not waste work.
        logger.debug({ stripeEventType: event.type }, "Ignored Stripe webhook event");
    }
  });
}
