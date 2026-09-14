"use client";

import Link from "next/link";
import { ArrowLeft, PenLine } from "lucide-react";
import { EditorShell } from "../../EditorShell";
import { DashboardPageHeader } from "@/components/dashboard/shell";
import { ArticleEditorForm } from "../ArticleEditorForm";
import type { EditorUser } from "../../types";

interface NewArticleClientProps {
  user: EditorUser;
  badges?: { drafts?: number; pending?: number };
}

export function NewArticleClient({ user, badges }: NewArticleClientProps) {
  return (
    <EditorShell user={user} badges={badges}>
      <div className="mb-4">
        <Link
          href="/editorial/articles"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-stone-500 hover:text-amber-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Articles
        </Link>
      </div>
      <DashboardPageHeader
        eyebrow="New draft"
        title="Compose a new article"
        description="Write your headline, excerpt, and body. Save a draft anytime — submit for review when you're ready for the editorial desk."
      />

      <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 md:p-8">
        <ArticleEditorForm mode="create" />
      </div>

      <div className="mt-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-900 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <PenLine className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
          <div>
            <strong className="font-headline">Editorial tip:</strong> Before
            submitting, double-check your byline, the dateline, and any
            attribution. The body needs at least 50 characters to be eligible
            for review. See <Link href="/editorial/help" className="underline font-medium">the help page</Link> for the full checklist.
          </div>
        </div>
      </div>
    </EditorShell>
  );
}
