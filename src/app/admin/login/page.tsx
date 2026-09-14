"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/admin/reports";
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Login failed");
      }
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-sm border border-stone-300 bg-white p-8 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-3 font-headline text-2xl font-black text-black dark:text-white">
          Admin Sign In
        </h1>
        <p className="mt-1 font-sans text-xs text-stone-500 dark:text-stone-400">
          Enter the password to access the moderation queue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="h-11 w-full rounded-none border border-stone-400 bg-white pl-10 pr-3 font-sans text-sm outline-none focus:border-black dark:border-stone-700 dark:bg-stone-950 dark:text-white"
            aria-label="Admin password"
            disabled={loading}
          />
        </div>
        {error && (
          <p className="font-sans text-xs text-red-700">{error}</p>
        )}
        <Button
          type="submit"
          disabled={loading || !password}
          className="h-11 w-full rounded-none bg-black text-sm font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign In
        </Button>
      </form>

      <p className="mt-4 text-center font-sans text-[11px] text-stone-400 dark:text-stone-500">
        Authorized personnel only.
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to homepage
        </Link>

        <React.Suspense fallback={<div className="rounded-sm border border-stone-300 bg-white p-8 dark:border-stone-700 dark:bg-stone-900">Loading…</div>}>
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
