"use client";

/**
 * Payment records view.
 *
 * Renders summary cards (succeeded revenue, failed count, refunded amount),
 * a filterable table, and a CSV export button that downloads a Blob.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Receipt,
  DollarSign,
  XCircle,
  RotateCcw,
  Download,
  Search,
} from "lucide-react";
import { DashboardPageHeader, StatCard, EmptyState } from "@/components/dashboard/shell";
import { AdminShell, type AdminShellUser } from "@/components/admin/admin-shell";
import {
  formatCurrency,
  formatDateTime,
  paymentStatusBadgeClass,
  tierBadgeClass,
  titleCase,
} from "@/components/admin/helpers";
import type { AdminPaymentRow } from "@/components/admin/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["all", "succeeded", "pending", "failed", "refunded"] as const;
const TIERS = ["all", "digital", "allaccess"] as const;

export interface AdminPaymentsViewProps {
  user: AdminShellUser;
  pendingCount: number;
  payments: AdminPaymentRow[];
  totalSucceeded: number; // cents
  failedCount: number;
  refundedAmount: number; // cents
}

export function AdminPaymentsView({
  user,
  pendingCount,
  payments,
  totalSucceeded,
  failedCount,
  refundedAmount,
}: AdminPaymentsViewProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (tierFilter !== "all" && p.tier !== tierFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const haystack = `${p.user.name ?? ""} ${p.user.email} ${p.providerInvoice ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [payments, statusFilter, tierFilter, query]);

  function exportCsv() {
    try {
      const headers = [
        "Date",
        "User Name",
        "User Email",
        "Tier",
        "Billing Cycle",
        "Amount (cents)",
        "Amount (USD)",
        "Provider",
        "Status",
        "Invoice ID",
      ];
      const rows = filtered.map((p) => [
        new Date(p.createdAt).toISOString(),
        p.user.name ?? "",
        p.user.email,
        p.tier,
        p.billingCycle,
        String(p.amount),
        (p.amount / 100).toFixed(2),
        p.provider,
        p.status,
        p.providerInvoice ?? "",
      ]);
      const escape = (s: string) => {
        if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const csv = [headers, ...rows]
        .map((r) => r.map((v) => escape(String(v))).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filtered.length} payments to CSV.`);
    } catch {
      toast.error("Failed to export CSV.");
    }
  }

  return (
    <AdminShell
      user={user}
      navBadge={[{ href: "/admin/reviews", count: pendingCount }]}
    >
      <DashboardPageHeader
        eyebrow="Revenue"
        title="Payment Records"
        description="Every payment captured by the mock provider. Filter by status and tier, then export as needed."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Revenue (Succeeded)"
          value={formatCurrency(totalSucceeded)}
          icon={DollarSign}
          accent="text-emerald-700 dark:text-emerald-400"
        />
        <StatCard
          label="Failed Payments"
          value={failedCount.toLocaleString()}
          icon={XCircle}
          accent="text-rose-700 dark:text-rose-400"
        />
        <StatCard
          label="Refunded Amount"
          value={formatCurrency(refundedAmount)}
          icon={RotateCcw}
          accent="text-stone-700 dark:text-stone-300"
        />
      </div>

      {/* Filter bar */}
      <div className="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                type="search"
                placeholder="Search by user or invoice…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All statuses" : titleCase(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All tiers" : titleCase(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <div className="mt-3 text-xs text-stone-500 dark:text-stone-400">
          Showing <span className="font-semibold text-stone-700 dark:text-stone-300">{filtered.length}</span> of {payments.length} payments
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Receipt}
            title={payments.length === 0 ? "No payments yet" : "No matches"}
            description={
              payments.length === 0
                ? "When members subscribe via /member/subscribe, their payments will appear here."
                : "Try adjusting your filters or search query."
            }
          />
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 dark:bg-stone-900/80 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Date</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">User</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Tier</th>
                  <th className="text-right font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Amount</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Cycle</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Provider</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Status</th>
                  <th className="text-left font-semibold text-stone-600 dark:text-stone-400 px-4 py-3">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                        {p.user.name ?? "(no name)"}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                        {p.user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierBadgeClass(
                          p.tier
                        )}`}
                      >
                        {titleCase(p.tier)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-headline text-base font-bold tabular-nums text-stone-900 dark:text-stone-50">
                        {formatCurrency(p.amount)}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        {p.currency}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600 dark:text-stone-400">
                      {titleCase(p.billingCycle)}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-600 dark:text-stone-400">
                      {p.provider}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${paymentStatusBadgeClass(
                          p.status
                        )}`}
                      >
                        {titleCase(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500 dark:text-stone-400 font-mono truncate max-w-[180px]">
                      {p.providerInvoice ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-stone-200 dark:divide-stone-800">
            {filtered.map((p) => (
              <li key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {p.user.name ?? "(no name)"}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 truncate">
                      {p.user.email}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-headline text-base font-bold tabular-nums text-stone-900 dark:text-stone-50">
                      {formatCurrency(p.amount)}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${paymentStatusBadgeClass(
                        p.status
                      )}`}
                    >
                      {titleCase(p.status)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierBadgeClass(p.tier)}`}>
                    {titleCase(p.tier)}
                  </span>
                  <span>· {titleCase(p.billingCycle)}</span>
                  <span>· {p.provider}</span>
                  <span>· {formatDateTime(p.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  );
}
