"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  ListChecks,
  PenLine,
  Send,
  Sparkles,
  Tag,
} from "lucide-react";
import { EditorShell } from "../EditorShell";
import { DashboardPageHeader } from "@/components/dashboard/shell";
import type { EditorUser } from "../types";

interface HelpClientProps {
  user: EditorUser;
  badges?: { drafts?: number; pending?: number };
}

const CHECKLIST = [
  {
    icon: PenLine,
    title: "Headline",
    detail: "Clear, specific, ≤ 200 characters. Avoid clickbait — describe what the story is.",
  },
  {
    icon: FileText,
    title: "Excerpt / Dek",
    detail: "One sentence (≤ 500 characters) summarizing the story. Appears under the headline.",
  },
  {
    icon: ImageIcon,
    title: "Hero image",
    detail: "A wide, high-resolution photo with a caption crediting the source.",
  },
  {
    icon: FileText,
    title: "Body",
    detail: "Minimum 50 characters to submit. Use markdown headings, blockquotes, and lists for structure.",
  },
  {
    icon: Tag,
    title: "Tags",
    detail: "3–5 comma-separated tags to help readers find related coverage.",
  },
];

const WORKFLOW = [
  {
    icon: PenLine,
    label: "Draft",
    description: "You write and save the article. Drafts are private — only you and admins can see them.",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  },
  {
    icon: Send,
    label: "Submit for review",
    description: "Once your draft is ready, click Submit to send it to the editorial desk. The article moves to 'Pending Review'.",
    tone: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  },
  {
    icon: Clock,
    label: "Admin review",
    description: "An editor-in-chief reviews the article. They can approve, reject with notes, or request changes. You'll see their feedback on the edit page.",
    tone: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  },
  {
    icon: CheckCircle2,
    label: "Published",
    description: "Approved articles go live on the site. Editors cannot modify published articles directly — contact an admin to request changes.",
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
];

export function HelpClient({ user, badges }: HelpClientProps) {
  return (
    <EditorShell user={user} badges={badges}>
      <DashboardPageHeader
        eyebrow="Editor workspace"
        title="Help & editorial guidelines"
        description="Everything you need to know about the editorial workflow at The Daily Post — from first draft to publication."
      />

      {/* Workflow */}
      <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <header className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
            The editorial workflow
          </h2>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
            Every article moves through four stages before it appears on the site.
          </p>
        </header>
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y divide-stone-200 dark:divide-stone-800 md:divide-y-0 md:[&>li]:border-r md:divide-x divide-stone-200 dark:divide-stone-800">
          {WORKFLOW.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.label} className="p-5 relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ${step.tone}`}>
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-stone-500" />
                </div>
                <h3 className="font-headline text-base font-semibold text-stone-900 dark:text-stone-50">
                  {step.label}
                </h3>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Pre-submission checklist */}
      <section className="mt-8 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <header className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-amber-700" />
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
              Pre-submission checklist
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
            Run through these before clicking <em>Submit for review</em>. Articles that
            fail the body-length or title check will be rejected by the API.
          </p>
        </header>
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {CHECKLIST.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="px-5 py-4 flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 shrink-0 text-amber-700" strokeWidth={2.2} />
                <div>
                  <h3 className="font-headline text-sm font-semibold text-stone-900 dark:text-stone-50">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-400">
                    {item.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tips */}
      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <Sparkles className="h-5 w-5 text-amber-700 mb-3" />
          <h3 className="font-headline text-base font-semibold text-stone-900 dark:text-stone-50">
            Markdown basics
          </h3>
          <ul className="mt-2 text-sm text-stone-600 dark:text-stone-400 space-y-1.5">
            <li><code className="font-mono text-[12px] bg-stone-100 dark:bg-stone-800 px-1 rounded"># H1</code> for the lede</li>
            <li><code className="font-mono text-[12px] bg-stone-100 dark:bg-stone-800 px-1 rounded">**bold**</code>, <code className="font-mono text-[12px] bg-stone-100 dark:bg-stone-800 px-1 rounded">*italic*</code></li>
            <li><code className="font-mono text-[12px] bg-stone-100 dark:bg-stone-800 px-1 rounded">{"> quote"}</code> for pull quotes</li>
            <li><code className="font-mono text-[12px] bg-stone-100 dark:bg-stone-800 px-1 rounded">- item</code> for bullet lists</li>
            <li><code className="font-mono text-[12px] bg-stone-100 dark:bg-stone-800 px-1 rounded">[text](url)</code> for links</li>
          </ul>
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <HelpCircle className="h-5 w-5 text-amber-700 mb-3" />
          <h3 className="font-headline text-base font-semibold text-stone-900 dark:text-stone-50">
            What happens to my draft?
          </h3>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Drafts are private. Submitting moves them to <em>Pending Review</em>,
            visible to admins. Editing a pending article moves it back to draft —
            re-submit when you're done.
          </p>
        </div>

        <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <Send className="h-5 w-5 text-amber-700 mb-3" />
          <h3 className="font-headline text-base font-semibold text-stone-900 dark:text-stone-50">
            Editorial review
          </h3>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            An editor-in-chief will approve, reject, or request changes. Feedback
            appears in the <em>Latest feedback</em> panel on your dashboard and on
            the edit page.
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/editorial/articles/new"
          className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-amber-800 transition-colors"
        >
          <PenLine className="h-3.5 w-3.5" />
          Start a new article
        </Link>
        <Link
          href="/editorial"
          className="inline-flex items-center gap-2 rounded-md border border-stone-300 dark:border-stone-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700 dark:text-stone-300 hover:border-amber-400 hover:text-amber-700 transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </EditorShell>
  );
}
