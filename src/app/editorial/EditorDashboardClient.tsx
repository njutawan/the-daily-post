"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  PenLine,
  MessageSquare,
  Eye,
} from "lucide-react";
import { EditorShell } from "./EditorShell";
import { DashboardPageHeader, StatCard, EmptyState } from "@/components/dashboard/shell";
import { StatusBadge, type ArticleStatus } from "./StatusBadge";
import { CATEGORY_LABELS, type EditorArticleSummary, type EditorStats, type EditorUser } from "./types";

interface EditorDashboardClientProps {
  user: EditorUser;
  stats: EditorStats;
  recent: EditorArticleSummary[];
  feedback: EditorArticleSummary[];
}

export function EditorDashboardClient({
  user,
  stats,
  recent,
  feedback,
}: EditorDashboardClientProps) {
  const firstName = user.name?.split(" ")[0] ?? user.email.split("@")[0];
  const badges = {
    drafts: stats.drafts,
    pending: stats.pending,
  };

  return (
    <EditorShell user={user} badges={badges}>
      <DashboardPageHeader
        eyebrow="Editor workspace"
        title={`Welcome, ${firstName}`}
        description="Track your drafts, submissions in review, and feedback from the editorial desk. Click any article to keep writing."
        actions={
          <Link
            href="/editorial/articles/new"
            className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-amber-800 transition-colors"
          >
            <PenLine className="h-3.5 w-3.5" />
            New article
          </Link>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Drafts"
          value={stats.drafts}
          icon={FileText}
          accent="text-amber-700"
          hint={stats.drafts === 1 ? "in progress" : "in progress"}
        />
        <StatCard
          label="Pending Review"
          value={stats.pending}
          icon={Clock}
          accent="text-sky-700"
          hint="awaiting admin"
        />
        <StatCard
          label="Published"
          value={stats.published}
          icon={CheckCircle2}
          accent="text-emerald-700"
          hint="live on site"
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          accent="text-rose-700"
          hint="needs revision"
        />
      </div>

      {/* Recent activity + feedback */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <section className="lg:col-span-2 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <header className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
              Recent activity
            </h2>
            <Link
              href="/editorial/articles"
              className="text-xs uppercase tracking-[0.18em] text-amber-700 hover:text-amber-800 dark:text-amber-400"
            >
              View all →
            </Link>
          </header>

          {recent.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={FileText}
                title="No articles yet"
                description="Start your first draft and submit it for review."
                action={
                  <Link
                    href="/editorial/articles/new"
                    className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-amber-800 transition-colors"
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    New article
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/editorial/articles/${a.id}/edit`}
                    className="group flex items-start gap-4 px-5 py-4 hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={a.status as ArticleStatus} />
                        <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                          {CATEGORY_LABELS[a.category as keyof typeof CATEGORY_LABELS] ?? a.category}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-headline text-base font-semibold text-stone-900 dark:text-stone-50 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 line-clamp-1">
                          {a.excerpt}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-stone-500">
                        <span>Updated {format(new Date(a.updatedAt), "MMM d, yyyy")}</span>
                        {a.viewCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {a.viewCount.toLocaleString()}
                          </span>
                        )}
                        {a.commentCount > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {a.commentCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone-400 group-hover:text-amber-700 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Feedback */}
        <section className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <header className="px-5 py-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="font-headline text-lg font-bold text-stone-900 dark:text-stone-50">
              Latest feedback from admin
            </h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-stone-500">
              Notes on rejected / change-requested drafts
            </p>
          </header>

          {feedback.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={MessageSquare}
                title="No feedback yet"
                description="When an editor-in-chief leaves notes on your submissions, they'll appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {feedback.map((a) => (
                <li key={a.id} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={a.status as ArticleStatus} />
                    {a.reviewerName && (
                      <span className="text-[11px] uppercase tracking-[0.18em] text-stone-500">
                        From {a.reviewerName}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/editorial/articles/${a.id}/edit`}
                    className="font-headline text-base font-semibold text-stone-900 dark:text-stone-50 hover:text-amber-700 dark:hover:text-amber-400 transition-colors line-clamp-1"
                  >
                    {a.title}
                  </Link>
                  {a.reviewNotes && (
                    <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 italic line-clamp-3">
                      “{a.reviewNotes}”
                    </p>
                  )}
                  <div className="mt-2 text-xs text-stone-500">
                    {format(new Date(a.updatedAt), "MMM d, yyyy")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </EditorShell>
  );
}
