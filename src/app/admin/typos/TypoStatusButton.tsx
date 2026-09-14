"use client";

import * as React from "react";
import { Loader2, Check, X, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type TypoStatusButtonProps = {
  reportId: string;
  status: "pending" | "applied" | "dismissed";
  label: string;
};

export function TypoStatusButton({ reportId, status, label }: TypoStatusButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/typos/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  const Icon =
    status === "applied" ? Check : status === "dismissed" ? X : RotateCcw;
  const accent =
    status === "applied"
      ? "hover:border-green-700 hover:text-green-700"
      : status === "dismissed"
        ? "hover:border-stone-500"
        : "hover:border-red-700 hover:text-red-700";

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 rounded-sm border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 transition disabled:opacity-60 dark:border-stone-700 dark:text-stone-300",
        accent
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}

export default TypoStatusButton;
