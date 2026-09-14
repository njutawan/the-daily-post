"use client";

/**
 * Client view for `/member/billing`.
 *
 * Renders a summary at the top (total spent, current plan, next renewal),
 * then a table of the user's last 20 payments with mock invoice IDs and a
 * "Download invoice" link (mock — points to `#`).
 */

import Link from "next/link";
import { Receipt, Download, ArrowRight, CalendarClock } from "lucide-react";
import { format, parseISO } from "date-fns";

import { MemberShell } from "@/components/member/member-shell";
import { EmptyState } from "@/components/dashboard/shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PAYMENT_STATUS_BADGE_CLASS,
  PLAN_BADGE_CLASS,
  formatPrice,
  planLabel,
  type BillingSummary,
  type MemberUser,
  type PaymentItem,
} from "@/components/member/types";

interface BillingViewProps {
  user: MemberUser;
  payments: PaymentItem[];
  summary: BillingSummary;
}

export function MemberBillingView({ user, payments, summary }: BillingViewProps) {
  return (
    <MemberShell user={user}>
      {/* Page header */}
      <div className="pb-6 mb-6 border-b border-stone-200 dark:border-stone-800">
        <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700 mb-2">
          Billing
        </div>
        <h1 className="font-headline text-2xl md:text-3xl font-bold text-stone-900 dark:text-stone-50">
          Billing history
        </h1>
        <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
          A record of every payment you&rsquo;ve made to The Daily Post. Invoices
          download as PDF (mock for this demo).
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard
          label="Total spent"
          value={formatPrice(summary.totalSpentCents)}
          icon={<Receipt className="h-4 w-4 text-emerald-700" />}
        />
        <SummaryCard
          label="Current plan"
          value={planLabel(summary.currentPlan)}
          icon={
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PLAN_BADGE_CLASS[user.subTier]}`}>
              {planLabel(user.subTier)}
            </span>
          }
        />
        <SummaryCard
          label="Next renewal"
          value={summary.nextRenewalAt ? format(parseISO(summary.nextRenewalAt), "MMM d, yyyy") : "—"}
          hint={summary.nextRenewalAt ? "Auto-renews" : "No renewal scheduled"}
          icon={<CalendarClock className="h-4 w-4 text-amber-700" />}
        />
      </div>

      {/* Payments table */}
      {payments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payments yet"
          description="When you subscribe to a paid plan, your invoices will appear here."
          action={
            <Link
              href="/member/subscribe"
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-emerald-800 transition-colors"
            >
              View plans <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50 dark:bg-stone-950">
                <TableHead className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Date</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Plan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Amount</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Billing cycle</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-[0.18em] text-stone-500">Invoice</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-[0.18em] text-stone-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm text-stone-700 dark:text-stone-300">
                    {format(parseISO(p.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${PLAN_BADGE_CLASS[p.tier as keyof typeof PLAN_BADGE_CLASS] ?? "bg-stone-100 text-stone-700"}`}>
                      {planLabel(p.tier)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatPrice(p.amount)} {p.currency}
                  </TableCell>
                  <TableCell className="text-sm text-stone-600 dark:text-stone-400 capitalize">
                    {p.billingCycle}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${PAYMENT_STATUS_BADGE_CLASS[p.status] ?? "bg-stone-100 text-stone-700"}`}>
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-stone-500">
                    {p.providerInvoice ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                      title="Mock invoice download"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Helper footer */}
      <div className="mt-6 flex items-start gap-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-4 text-xs text-stone-500">
        <Receipt className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Need a custom receipt or a tax document? Email{" "}
          <Link href="mailto:billing@daily-post.test" className="underline hover:text-emerald-700">
            billing@daily-post.test
          </Link>{" "}
          and we&rsquo;ll respond within 1 business day. To change your payment
          method, head to{" "}
          <Link href="/member/subscribe" className="underline hover:text-emerald-700">
            subscription plans
          </Link>
          .
        </span>
      </div>
    </MemberShell>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
      <div className="flex items-start justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
          {label}
        </div>
        <div>{icon}</div>
      </div>
      <div className="mt-3 font-headline text-2xl font-bold text-stone-900 dark:text-stone-50">
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-stone-500">{hint}</div>}
    </div>
  );
}
