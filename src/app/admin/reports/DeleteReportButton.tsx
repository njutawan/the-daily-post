"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const router = useRouter();

  async function handleDismiss() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to dismiss");
      setDone(true);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDismiss}
      disabled={loading || done}
      className="flex items-center gap-1.5 rounded-sm border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 transition hover:border-green-700 hover:text-green-700 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : done ? (
        <Check className="h-3 w-3" />
      ) : null}
      {done ? "Dismissed" : "Dismiss report"}
    </button>
  );
}

export default DeleteReportButton;
