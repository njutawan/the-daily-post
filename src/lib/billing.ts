import { db } from "@/lib/db";
import { isSubscriptionInGoodStanding, mapStripeSubscriptionStatus } from "@/lib/subscription";
import {
  getStripePlan,
  getStripeSiteUrl,
  stripeRequest,
  type StripePlanId,
} from "@/lib/stripe";

export class BillingError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "BillingError";
    this.status = status;
  }
}

type StripeCustomer = Record<string, unknown> & { id: string };
type CheckoutSession = Record<string, unknown> & { id: string; url: string | null };
type PortalSession = Record<string, unknown> & { id: string; url: string };
type StripeSubscription = Record<string, unknown> & { id: string; status: string };

function periodEndFromSubscription(subscription: Record<string, unknown>): Date | null {
  const direct = subscription.current_period_end;
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return new Date(direct * 1000);
  }
  const items = subscription.items as Record<string, unknown> | undefined;
  const itemRows = Array.isArray(items?.data) ? items.data : [];
  const ends = itemRows
    .map((item) => {
      const row = item as Record<string, unknown>;
      return typeof row.current_period_end === "number" ? row.current_period_end : null;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  return ends.length > 0 ? new Date(Math.max(...ends) * 1000) : null;
}

function unixDateFrom(value: unknown): Date | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? new Date(value * 1000)
    : null;
}

async function ensureStripeCustomer(user: {
  id: string;
  email: string;
  name: string | null;
  stripeCustomerId: string | null;
}): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const form = new URLSearchParams({
    email: user.email,
    "metadata[userId]": user.id,
  });
  if (user.name) form.set("name", user.name);

  const customer = await stripeRequest<StripeCustomer>("customers", {
    method: "POST",
    form,
    idempotencyKey: `daily-post-customer-${user.id}`,
  });

  await db.user.updateMany({
    where: { id: user.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });

  const latestUser = await db.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });
  return latestUser?.stripeCustomerId || customer.id;
}

export async function createStripeCheckoutSession(options: {
  userId: string;
  planId: string;
  requestOrigin: string;
}): Promise<{ url: string; sessionId: string }> {
  const plan = getStripePlan(options.planId);
  if (!plan) throw new BillingError("Choose a valid subscription plan.", 422);

  const user = await db.user.findUnique({
    where: { id: options.userId },
    select: {
      id: true,
      email: true,
      name: true,
      subTier: true,
      subStatus: true,
      subExpiresAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!user) throw new BillingError("Account not found.", 404);

  if (isSubscriptionInGoodStanding(user)) {
    throw new BillingError("You already have an active subscription. Manage it from your billing portal.", 409);
  }
  if (user.stripeSubscriptionId && user.subStatus !== "canceled" && user.subStatus !== "expired") {
    throw new BillingError(
      "A Stripe subscription is already attached to this account. Manage or resolve it in your billing portal before starting another checkout.",
      409,
    );
  }

  const siteUrl = getStripeSiteUrl(options.requestOrigin);
  const customerId = await ensureStripeCustomer(user);
  const payment = await db.payment.create({
    data: {
      userId: user.id,
      amount: plan.amount,
      currency: plan.currency.toUpperCase(),
      tier: plan.tier,
      billingCycle: plan.billingCycle,
      status: "pending",
      provider: "stripe",
    },
  });

  const form = new URLSearchParams({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    success_url: `${siteUrl}/member/billing?checkout=success`,
    cancel_url: `${siteUrl}/member/subscribe?checkout=cancelled&plan=${encodeURIComponent(plan.id)}`,
    "line_items[0][price]": plan.priceId,
    "line_items[0][quantity]": "1",
    "metadata[userId]": user.id,
    "metadata[paymentId]": payment.id,
    "metadata[planId]": plan.id,
    "metadata[tier]": plan.tier,
    "metadata[billingCycle]": plan.billingCycle,
    "subscription_data[metadata][userId]": user.id,
    "subscription_data[metadata][paymentId]": payment.id,
    "subscription_data[metadata][planId]": plan.id,
    "subscription_data[metadata][tier]": plan.tier,
    "subscription_data[metadata][billingCycle]": plan.billingCycle,
  });

  try {
    const session = await stripeRequest<CheckoutSession>("checkout/sessions", {
      method: "POST",
      form,
      idempotencyKey: `daily-post-checkout-${payment.id}`,
    });
    if (!session.url || !session.id) {
      throw new BillingError("Stripe did not return a Checkout URL.", 502);
    }
    await db.payment.update({
      where: { id: payment.id },
      data: { stripeCheckoutSessionId: session.id },
    });
    return { url: session.url, sessionId: session.id };
  } catch (error) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "failed" } }).catch(() => undefined);
    throw error;
  }
}

export async function createStripePortalSession(options: {
  userId: string;
  requestOrigin: string;
}): Promise<{ url: string }> {
  const user = await db.user.findUnique({
    where: { id: options.userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) {
    throw new BillingError("No Stripe billing account was found for this user.", 409);
  }

  const form = new URLSearchParams({
    customer: user.stripeCustomerId,
    return_url: `${getStripeSiteUrl(options.requestOrigin)}/member/subscribe`,
  });
  const session = await stripeRequest<PortalSession>("billing_portal/sessions", {
    method: "POST",
    form,
  });
  return { url: session.url };
}

export async function cancelStripeSubscription(options: {
  userId: string;
  immediate: boolean;
}): Promise<{ status: string; expiresAt: Date | null; cancelAtPeriodEnd: boolean }> {
  const user = await db.user.findUnique({
    where: { id: options.userId },
    select: {
      stripeSubscriptionId: true,
      subTier: true,
      subStatus: true,
      subExpiresAt: true,
    },
  });
  if (!user?.stripeSubscriptionId) {
    throw new BillingError("No Stripe subscription was found for this user.", 409);
  }
  if (user.subStatus === "canceled" || user.subStatus === "expired") {
    throw new BillingError("Your subscription is already canceled.", 409);
  }

  const subscription = options.immediate
    ? await stripeRequest<StripeSubscription>(`subscriptions/${encodeURIComponent(user.stripeSubscriptionId)}`, {
        method: "DELETE",
        idempotencyKey: `daily-post-cancel-now-${user.stripeSubscriptionId}`,
      })
    : await stripeRequest<StripeSubscription>(`subscriptions/${encodeURIComponent(user.stripeSubscriptionId)}`, {
        method: "POST",
        form: new URLSearchParams({ cancel_at_period_end: "true" }),
        idempotencyKey: `daily-post-cancel-period-end-${user.stripeSubscriptionId}`,
      });

  const status = mapStripeSubscriptionStatus(subscription.status);
  const expiresAt = options.immediate
    ? unixDateFrom(subscription.ended_at) || unixDateFrom(subscription.canceled_at) || new Date()
    : periodEndFromSubscription(subscription) || user.subExpiresAt;
  const cancelAtPeriodEnd = !options.immediate && subscription.cancel_at_period_end === true;

  await db.user.update({
    where: { id: options.userId },
    data: {
      subStatus: status,
      subExpiresAt: expiresAt,
      subCancelAtPeriodEnd: cancelAtPeriodEnd,
      stripeStatusUpdatedAt: new Date(),
    },
  });

  return { status, expiresAt, cancelAtPeriodEnd };
}

export function validPlanId(value: unknown): value is StripePlanId {
  return value === "digital" || value === "digital-annual" || value === "allaccess";
}
