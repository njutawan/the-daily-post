/**
 * Shared types + helpers for the member area.
 *
 * Server components convert Prisma rows into the JSON-serializable shapes
 * declared here before passing them to the client view components.
 */

export type SubTier = "free" | "digital" | "allaccess";
export type SubStatus = "active" | "canceled" | "expired" | "past_due";

export interface MemberUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subTier: SubTier;
  subStatus: SubStatus;
  subExpiresAt: string | null; // ISO string
  avatarUrl: string | null;
  byline: string | null;
  bio: string | null;
  createdAt: string; // ISO string
}

export interface SubscriptionSummary {
  tier: SubTier;
  status: SubStatus;
  expiresAt: string | null;
}

export interface ContinueReadingItem {
  articleId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  heroImage: string | null;
  progress: number; // 0-100
  lastReadAt: string; // ISO
}

export interface RecommendedArticle {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  heroImage: string | null;
  authorName: string | null;
  publishedAt: string | null;
}

export interface HistoryItem {
  articleId: string;
  slug: string;
  title: string;
  category: string;
  heroImage: string | null;
  excerpt: string | null;
  publishedAt: string | null;
  progress: number;
  lastReadAt: string;
}

export interface SavedItem {
  articleId: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  heroImage: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  tier: string;
  billingCycle: string;
  status: string;
  provider: string;
  providerInvoice: string | null;
  createdAt: string;
}

export interface DashboardStats {
  articlesRead30d: number;
  savedCount: number;
  currentPlan: string;
  daysUntilRenewal: number | null;
}

export interface BillingSummary {
  totalSpentCents: number;
  currentPlan: string;
  nextRenewalAt: string | null;
  paymentCount: number;
}

// ─────────────────────────────────────────────────────────────
// Display helpers (also used by client components)
// ─────────────────────────────────────────────────────────────

export const PLAN_LABELS: Record<SubTier, string> = {
  free: "Free",
  digital: "Digital",
  allaccess: "All Access",
};

export const STATUS_LABELS: Record<SubStatus, string> = {
  active: "Active",
  canceled: "Canceled",
  expired: "Expired",
  past_due: "Past due",
};

export const PLAN_BADGE_CLASS: Record<SubTier, string> = {
  free: "bg-stone-100 text-stone-700 border border-stone-300",
  digital: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  allaccess: "bg-amber-100 text-amber-800 border border-amber-300",
};

export const STATUS_BADGE_CLASS: Record<SubStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  canceled: "bg-stone-100 text-stone-700 border border-stone-300",
  expired: "bg-rose-100 text-rose-800 border border-rose-300",
  past_due: "bg-rose-100 text-rose-800 border border-rose-300",
};

export const PAYMENT_STATUS_BADGE_CLASS: Record<string, string> = {
  succeeded: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  pending: "bg-amber-100 text-amber-800 border border-amber-300",
  failed: "bg-rose-100 text-rose-800 border border-rose-300",
  refunded: "bg-stone-200 text-stone-700 border border-stone-400",
};

/**
 * Format an amount in minor units (cents) as a USD display string.
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Map a subTier to a short display label.
 */
export function planLabel(tier: string): string {
  return PLAN_LABELS[tier as SubTier] ?? tier;
}

/**
 * Pick the progress bar color based on completion.
 *   <30  → rose (just started)
 *   30-70 → amber (in progress)
 *   >70  → emerald (almost done / completed)
 */
export function progressColor(progress: number): string {
  if (progress < 30) return "bg-rose-500";
  if (progress <= 70) return "bg-amber-500";
  return "bg-emerald-600";
}
