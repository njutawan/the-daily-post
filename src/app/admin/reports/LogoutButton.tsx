"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-sm border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 hover:border-red-700 hover:text-red-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:border-red-500 dark:hover:text-red-500"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
}

export default LogoutButton;
