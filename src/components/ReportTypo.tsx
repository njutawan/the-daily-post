"use client";

import * as React from "react";
import { Type, Loader2, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type ReportTypoProps = {
  slug: string;
};

export function ReportTypo({ slug }: ReportTypoProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedText, setSelectedText] = React.useState("");
  const [correction, setCorrection] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const { toast } = useToast();

  // Capture the user's text selection within the reading column
  React.useEffect(() => {
    function handleSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectedText("");
        return;
      }
      // Only capture if the selection is within the article body
      const container = document.querySelector(".reading-column");
      if (container && container.contains(sel.anchorNode)) {
        const text = sel.toString().trim();
        if (text.length > 2 && text.length < 500) {
          setSelectedText(text);
        }
      }
    }
    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedText || !correction.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/typos/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedText: selectedText,
          correction: correction.trim(),
          reporter: "reader",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to submit");
      }
      toast({ title: "Thanks!", description: data.message });
      setOpen(false);
      setSelectedText("");
      setCorrection("");
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      toast({
        title: "Couldn't submit",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 border-t border-stone-200 pt-6 dark:border-stone-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:text-red-700 dark:text-stone-400"
      >
        <Type className="h-3.5 w-3.5" />
        Spotted a typo? Report it
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-sm border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              Report a typo
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Quoted text
                {selectedText ? " (selected in article)" : " — select text in the article above"}
              </label>
              <div className="rounded-sm border border-stone-300 bg-white px-3 py-2 font-body text-sm italic text-stone-700 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300">
                {selectedText || <span className="text-stone-400">No text selected — highlight the error in the article above.</span>}
              </div>
            </div>
            <div>
              <label className="mb-1 block font-sans text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Your correction
              </label>
              <Textarea
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="What should it say?"
                maxLength={500}
                rows={2}
                className="min-h-[50px] w-full resize-none rounded-sm border border-stone-400 bg-white px-2 py-1.5 font-body text-sm outline-none focus:border-black dark:border-stone-700 dark:bg-stone-950 dark:text-white"
                aria-label="Your correction"
                disabled={submitting}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] text-stone-500 dark:text-stone-400">
                {correction.length}/500
              </span>
              <Button
                type="submit"
                disabled={submitting || !selectedText || !correction.trim()}
                className="h-8 rounded-sm bg-black px-3 text-[11px] font-bold uppercase tracking-wider hover:bg-stone-800 disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Submit
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default ReportTypo;
