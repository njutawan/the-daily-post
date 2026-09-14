"use client";

/**
 * Client view for `/member/subscribe`.
 *
 * Renders a grid of subscription plan cards (hard-coded catalog matching
 * `/api/subscriptions/plans`) plus a payment `Dialog` with a mock credit
 * card form. On success the dialog shows a checkmark animation and the user
 * is redirected to `/member` after a short delay.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Loader2,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

import { MemberShell } from "@/components/member/member-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PLAN_BADGE_CLASS,
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  formatPrice,
  planLabel,
  type MemberUser,
  type SubscriptionSummary,
} from "@/components/member/types";

// ─── Static plan catalog (mirrors /api/subscriptions/plans) ──────────────
interface Plan {
  id: "free" | "digital" | "digital-annual" | "allaccess";
  name: string;
  price: number; // cents
  billingCycle: "monthly" | "annual";
  tagline: string;
  features: string[];
  highlight?: boolean;
  tier: "free" | "digital" | "allaccess";
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    billingCycle: "monthly",
    tier: "free",
    tagline: "Read 3 articles each month.",
    features: [
      "3 free articles / month",
      "Newsletters (daily briefing)",
      "Save up to 5 articles",
    ],
  },
  {
    id: "digital",
    name: "Digital",
    price: 499,
    billingCycle: "monthly",
    tier: "digital",
    tagline: "Unlimited articles on every device.",
    features: [
      "Unlimited articles",
      "Reader-friendly article pages (no ads)",
      "Save unlimited articles",
      "Reading history across devices",
      "Audio narration of articles",
    ],
    highlight: true,
  },
  {
    id: "digital-annual",
    name: "Digital Annual",
    price: 4999,
    billingCycle: "annual",
    tier: "digital",
    tagline: "Save 17% with the yearly plan.",
    features: [
      "Everything in Digital",
      "Save 17% vs monthly",
      "Priority newsletter access",
      "Early access to investigations",
    ],
  },
  {
    id: "allaccess",
    name: "All Access",
    price: 999,
    billingCycle: "monthly",
    tier: "allaccess",
    tagline: "Digital + premium newsletters + events.",
    features: [
      "Everything in Digital",
      "Premium newsletters (Politics, Tech, Climate)",
      "Invitations to live events",
      "Comment without moderation queue",
      "The Daily Post crossword archive",
    ],
  },
];

type PaymentState =
  | { kind: "form" }
  | { kind: "processing" }
  | { kind: "success"; plan: Plan }
  | { kind: "error"; message: string };

interface SubscribeViewProps {
  user: MemberUser;
  subscription: SubscriptionSummary;
}

export function MemberSubscribeView({ user, subscription }: SubscribeViewProps) {
  const router = useRouter();
  const [openPlan, setOpenPlan] = useState<Plan | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>({ kind: "form" });
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });

  function closeDialog() {
    if (paymentState.kind === "processing") return;
    setOpenPlan(null);
    setPaymentState({ kind: "form" });
    setCard({ number: "", expiry: "", cvc: "", name: "" });
  }

  function openPlanDialog(plan: Plan) {
    setPaymentState({ kind: "form" });
    setCard({ number: "", expiry: "", cvc: "", name: "" });
    setOpenPlan(plan);
  }

  async function handlePay() {
    if (!openPlan) return;
    if (!card.number || !card.expiry || !card.cvc || !card.name) {
      toast.error("Please fill in all card fields.");
      return;
    }
    setPaymentState({ kind: "processing" });
    try {
      const res = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: openPlan.id,
          paymentToken: `mock_${Date.now()}`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          (data && typeof data.error === "string" && data.error) ||
          "Payment failed. Please try again.";
        setPaymentState({ kind: "error", message });
        toast.error(message);
        return;
      }
      setPaymentState({ kind: "success", plan: openPlan });
      toast.success(`You're now on the ${openPlan.name} plan!`);
      // Redirect after 2 seconds so the success state has time to show.
      setTimeout(() => {
        router.push("/member");
      }, 2000);
    } catch {
      setPaymentState({ kind: "error", message: "Network error. Please try again." });
      toast.error("Network error. Please try again.");
    }
  }

  // Determine the "current plan" tier for button labels.
  const currentTier = subscription.tier;
  // Annual subscribers are on tier "digital" but use the "digital-annual" plan id.
  // We can't tell from subTier alone which annual cycle the user is on, so treat
  // both digital + annual cycle as "current" for the digital-annual card too.
  const isCurrentPlan = (plan: Plan): boolean => {
    if (plan.tier !== currentTier) return false;
    if (plan.tier === "allaccess") return true;
    if (plan.id === "digital") return subscription.tier === "digital";
    if (plan.id === "digital-annual") return subscription.tier === "digital";
    return plan.tier === "free";
  };

  const expiry = subscription.expiresAt ? format(parseISO(subscription.expiresAt), "MMM d, yyyy") : null;

  return (
    <MemberShell user={user}>
      {/* Page header */}
      <div className="pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 mb-2">
          Subscription
        </div>
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
          Choose your plan
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
          Read unlimited articles on every device. Cancel anytime — your access
          stays active until the end of the current billing cycle.
        </p>
      </div>

      {/* Current subscription banner */}
      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-stone-500 mb-1">
              Current subscription
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE_CLASS[subscription.tier]}`}>
                {planLabel(subscription.tier)}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS[subscription.status as keyof typeof STATUS_BADGE_CLASS]}`}>
                {STATUS_LABELS[subscription.status as keyof typeof STATUS_LABELS] ?? subscription.status}
              </span>
              {expiry && (
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  {subscription.tier === "free" ? "" : `Next renewal: ${expiry}`}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/member/billing"
            className="text-xs uppercase tracking-[0.18em] text-emerald-700 hover:text-emerald-900"
          >
            View billing history →
          </Link>
        </div>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const current = isCurrentPlan(plan);
          const isFree = plan.id === "free";
          // Strict tier ordering: free < digital < allaccess. A plan is an
          // "upgrade" only if its tier rank is strictly higher than the user's
          // current tier. Anything below the current tier is a downgrade.
          const tierRank: Record<Plan["tier"], number> = { free: 0, digital: 1, allaccess: 2 };
          const isUpgrade = !current && !isFree && tierRank[plan.tier] > tierRank[currentTier];
          const isDowngrade = !current && (isFree || tierRank[plan.tier] < tierRank[currentTier]);
          const highlight = plan.highlight;
          return (
            <div
              key={plan.id}
              className={`relative rounded-lg border-2 bg-white dark:bg-stone-900 p-5 flex flex-col transition-all ${
                highlight
                  ? "border-emerald-500 shadow-sm"
                  : "border-stone-200 dark:border-stone-800"
              } ${current ? "ring-2 ring-emerald-500/40" : ""}`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-700 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Most popular
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <h3 className="font-headline text-xl font-bold text-stone-900 dark:text-stone-50">
                  {plan.name}
                </h3>
                {current && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-headline text-3xl font-black text-stone-900 dark:text-stone-50">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-xs text-stone-500">
                  / {plan.billingCycle === "annual" ? "year" : "month"}
                </span>
              </div>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                {plan.tagline}
              </p>
              <ul className="mt-4 space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-700 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <PlanCtaButton
                  plan={plan}
                  current={current}
                  isUpgrade={isUpgrade}
                  isDowngrade={isDowngrade}
                  onSubscribe={() => openPlanDialog(plan)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="mt-6 flex items-start gap-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-4 text-xs text-stone-500">
        <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <span>
          This demo uses a mock payment provider — no real card is charged. In
          production, payments are processed by Stripe via a tokenized checkout
          that never touches our servers.
        </span>
      </div>

      {/* Payment dialog */}
      <Dialog
        open={openPlan !== null}
        onOpenChange={(o) => {
          if (!o) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          {paymentState.kind === "success" && openPlan ? (
            <div className="text-center py-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-emerald-700" strokeWidth={3} />
              </div>
              <DialogTitle className="font-headline text-xl font-bold text-stone-900 dark:text-stone-50">
                Payment successful
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm">
                You&rsquo;re now on the <strong>{paymentState.plan.name}</strong> plan.
                Redirecting you to your dashboard…
              </DialogDescription>
              <div className="mt-4 flex items-center justify-center text-xs text-stone-500 gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Redirecting…
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-headline">
                  {openPlan && `Subscribe to ${openPlan.name}`}
                </DialogTitle>
                <DialogDescription>
                  {openPlan &&
                    `You'll be charged ${formatPrice(openPlan.price)} ${openPlan.billingCycle === "annual" ? "per year" : "per month"}. Cancel anytime.`}
                </DialogDescription>
              </DialogHeader>

              {paymentState.kind === "error" && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{paymentState.message}</span>
                </div>
              )}

              <div className="grid gap-3 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="card-number">Card number</Label>
                  <Input
                    id="card-number"
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value })}
                    disabled={paymentState.kind === "processing"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="card-expiry">Expiry</Label>
                    <Input
                      id="card-expiry"
                      placeholder="MM / YY"
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                      disabled={paymentState.kind === "processing"}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="card-cvc">CVC</Label>
                    <Input
                      id="card-cvc"
                      inputMode="numeric"
                      placeholder="123"
                      value={card.cvc}
                      onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                      disabled={paymentState.kind === "processing"}
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="card-name">Name on card</Label>
                  <Input
                    id="card-name"
                    placeholder="Jane Q. Reader"
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    disabled={paymentState.kind === "processing"}
                  />
                </div>
                <p className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  Demo only — use any values. No real charge.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  disabled={paymentState.kind === "processing"}
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  onClick={handlePay}
                  disabled={paymentState.kind === "processing"}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  {paymentState.kind === "processing" ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3.5 w-3.5" />
                      {openPlan && `Pay ${formatPrice(openPlan.price)}`}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MemberShell>
  );
}

function PlanCtaButton({
  plan,
  current,
  isUpgrade,
  isDowngrade,
  onSubscribe,
}: {
  plan: Plan;
  current: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  onSubscribe: () => void;
}) {
  if (current) {
    return (
      <div className="w-full rounded-md border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-emerald-700">
        Current plan
      </div>
    );
  }

  if (plan.id === "free") {
    return (
      <button
        className="w-full rounded-md border border-stone-300 dark:border-stone-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-300 hover:border-rose-400 hover:text-rose-700 transition-colors"
        onClick={() => {
          // Free downgrade — show a confirm-style toast for the demo.
          toast.warning(
            "Downgrading to Free will remove unlimited access at the end of your current billing cycle. Contact support to confirm.",
            { duration: 6000 }
          );
        }}
        title="Downgrade to Free"
      >
        Downgrade to Free
      </button>
    );
  }

  if (plan.id === "digital-annual" || plan.id === "digital" || plan.id === "allaccess") {
    // Label: "Upgrade" when moving up the tier ladder, "Switch to [plan]"
    // for sidegrades (e.g. digital ↔ digital-annual), "Downgrade" when moving
    // down the tier ladder (e.g. allaccess → digital).
    const label = isUpgrade
      ? "Upgrade"
      : isDowngrade
        ? `Downgrade`
        : `Switch to ${plan.name.split(" ")[0]}`;
    return (
      <button
        onClick={onSubscribe}
        className={`w-full rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
          isDowngrade
            ? "border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-rose-400 hover:text-rose-700"
            : plan.highlight
              ? "bg-emerald-700 text-white hover:bg-emerald-800"
              : "border border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white"
        }`}
      >
        {label}
        <ArrowRight className="h-3 w-3" />
      </button>
    );
  }

  return null;
}
