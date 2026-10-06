export type StripeSubscriptionStatus = "active" | "past_due" | "canceled" | "expired" | "pending";

export function mapStripeSubscriptionStatus(status: string): StripeSubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      // A trial is a subscription state, not a confirmed payment.
      return "pending";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete_expired":
      return "expired";
    case "incomplete":
    case "paused":
    default:
      return "pending";
  }
}

export type SubscriptionState = {
  role?: string;
  subTier: string;
  subStatus: string;
  subExpiresAt: Date | null;
  stripeSubscriptionId: string | null;
  /** True only when a successful Stripe invoice exists for this subscription. */
  hasSuccessfulPayment?: boolean;
};

/**
 * Only an active Stripe subscription with a confirmed successful invoice grants
 * paid access. Canceled subscriptions retain access only through their paid-
 * through date. Admins remain privileged independently of billing state.
 */
export function hasPaidAccess(
  subscription: SubscriptionState | null | undefined,
  now = new Date(),
): boolean {
  if (!subscription) return false;
  if (subscription.role === "admin") return true;
  if (subscription.subTier !== "digital" && subscription.subTier !== "allaccess") return false;
  if (!subscription.stripeSubscriptionId || subscription.hasSuccessfulPayment !== true) return false;
  if (!subscription.subExpiresAt || subscription.subExpiresAt.getTime() <= now.getTime()) return false;
  return subscription.subStatus === "active" || subscription.subStatus === "canceled";
}

/** Whether a paid Stripe subscription should block creation of another checkout. */
export function isSubscriptionInGoodStanding(
  subscription: SubscriptionState | null | undefined,
  now = new Date(),
): boolean {
  if (!subscription) return false;
  if (subscription.subTier !== "digital" && subscription.subTier !== "allaccess") return false;
  if (!subscription.stripeSubscriptionId) return false;
  if (!subscription.subExpiresAt || subscription.subExpiresAt.getTime() <= now.getTime()) return false;
  return subscription.subStatus === "active" || subscription.subStatus === "canceled";
}
