"use client";

const STORAGE_KEY = "tdp:free-reads";
const FREE_LIMIT = 5;

type ReadTracker = {
  count: number;
  month: string; // e.g. "2026-09"
  slugs: string[]; // track which articles counted this month
};

function getMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function loadTracker(): ReadTracker {
  if (typeof window === "undefined") return { count: 0, month: getMonthKey(), slugs: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, month: getMonthKey(), slugs: [] };
    const parsed = JSON.parse(raw) as ReadTracker;
    // Reset on new month
    if (parsed.month !== getMonthKey()) {
      return { count: 0, month: getMonthKey(), slugs: [] };
    }
    return parsed;
  } catch {
    return { count: 0, month: getMonthKey(), slugs: [] };
  }
}

function saveTracker(tracker: ReadTracker) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracker));
  } catch {
    /* ignore */
  }
}

/**
 * Increment the free article read counter for a given slug.
 * Only counts if the slug hasn't been counted this month.
 * Returns the updated count.
 */
export function trackRead(slug: string): number {
  const tracker = loadTracker();
  if (tracker.slugs.includes(slug)) {
    return tracker.count; // already counted
  }
  tracker.slugs.push(slug);
  tracker.count += 1;
  saveTracker(tracker);
  return tracker.count;
}

/**
 * Get the current free read count and remaining reads.
 */
export function getReadStatus(): { count: number; remaining: number; limit: number } {
  const tracker = loadTracker();
  return {
    count: tracker.count,
    remaining: Math.max(0, FREE_LIMIT - tracker.count),
    limit: FREE_LIMIT,
  };
}

export { FREE_LIMIT };
