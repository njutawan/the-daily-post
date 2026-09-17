"use client";

import * as React from "react";
import { Trash2, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      setDone(true);
      setConfirming(false);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-green-700">
        <Check className="h-3 w-3" />
        Comment deleted
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-red-700">
          Delete this comment?
        </span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-sm bg-red-700 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-white hover:bg-red-800 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Yes, delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-sm border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-black dark:border-stone-700 dark:text-stone-400"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 rounded-sm border border-stone-300 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 transition hover:border-red-700 hover:text-red-700 dark:border-stone-700 dark:text-stone-300"
    >
      <Trash2 className="h-3 w-3" />
      Delete comment
    </button>
  );
}

export default DeleteCommentButton;
