"use client";

import { useState } from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type NewsletterFormProps = {
  variant?: "default" | "compact" | "band";
  className?: string;
  placeholder?: string;
  buttonLabel?: string;
  source?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({
  variant = "default",
  className,
  placeholder = "Your email address",
  buttonLabel = "Sign Up",
  source = "homepage",
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Subscription failed");
      }
      setStatus("done");
      setEmail("");
      toast({
        title: "You're in.",
        description: data.message || "Thanks for subscribing to The Daily Post.",
      });
      setTimeout(() => setStatus("idle"), 3500);
    } catch (err) {
      setStatus("idle");
      toast({
        title: "Couldn't subscribe",
        description:
          err instanceof Error ? err.message : "Please try again in a moment.",
        variant: "destructive",
      });
    }
  }

  const inputBase =
    "rounded-none border bg-white px-3 font-sans text-sm outline-none transition-colors focus:border-black dark:bg-stone-900 dark:border-stone-700 dark:focus:border-white dark:text-white dark:placeholder:text-stone-500";
  const btnBase =
    "shrink-0 rounded-none bg-black font-sans text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-stone-200";

  if (variant === "band") {
    return (
      <form className={cn("flex w-full max-w-md gap-2", className)} onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className={cn(inputBase, "h-10 w-full border-stone-400 dark:border-stone-700")}
          aria-label="Email address"
          disabled={status === "loading"}
        />
        <button
          type="submit"
          className={cn(btnBase, "h-10 px-5 flex items-center gap-1.5")}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : status === "done" ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {status === "done" ? "Done" : buttonLabel}
        </button>
      </form>
    );
  }

  return (
    <form className={cn("flex flex-wrap gap-2", className)} onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        className={cn(inputBase, "h-9 w-full border-stone-400 dark:border-stone-700")}
        aria-label="Email address"
        disabled={status === "loading"}
      />
      <button
        type="submit"
        className={cn(btnBase, "h-9 px-3 text-[11px] flex items-center gap-1.5")}
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "done" ? (
          <Check className="h-3.5 w-3.5" />
        ) : null}
        {status === "done" ? "Subscribed" : buttonLabel}
      </button>
      {status === "done" && (
        <span className="flex items-center gap-1 font-sans text-[11px] font-semibold text-green-700">
          <Check className="h-3 w-3" /> Welcome aboard
        </span>
      )}
    </form>
  );
}

export default NewsletterForm;
