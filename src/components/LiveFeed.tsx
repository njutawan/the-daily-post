"use client";

import * as React from "react";
import { RefreshCw, Radio, Plus, Users } from "lucide-react";
import type { LiveUpdate } from "@/data/articles";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL = 60; // seconds

// Pool of simulated "incoming" updates to prepend on each refresh (fallback when no socket)
const incomingPool: Omit<LiveUpdate, "id" | "timestamp">[] = [
  {
    time: "just now",
    title: "House Speaker Delgado schedules floor vote for Thursday",
    body: "In a statement released moments ago, the Speaker's office said the infrastructure bill will come to the House floor Thursday afternoon, with a Rules Committee hearing Wednesday evening.",
    author: "Eleanor Whitfield",
    tag: "Breaking",
    highlight: true,
  },
  {
    time: "just now",
    title: "Treasury announces $55B water-pipe replacement fund",
    body: "The department will begin accepting applications from states next month for the lead-pipe replacement program, one of the bill's marquee public-health provisions.",
    author: "Robert Kingsley",
    tag: "Implementation",
  },
  {
    time: "just now",
    title: "Construction industry groups hail 'decade-defining' investment",
    body: "The Associated General Contractors called the bill 'the most significant federal commitment to the built environment in a generation,' projecting 600,000 new jobs over five years.",
    author: "Terrence Mallow",
    tag: "Reaction",
  },
  {
    time: "just now",
    title: "Progressive caucus demands climate package move 'in lockstep'",
    body: "A letter signed by 38 House members warns they will not support the infrastructure bill without a parallel vote on the broader climate and social-spending package.",
    author: "Daniel Park",
    tag: "What's next",
  },
  {
    time: "just now",
    title: "Markets open higher on infrastructure optimism; construction stocks lead",
    body: "Futures pointed to a sharply higher open, with cement, steel, and engineering firms among the biggest pre-market gainers.",
    author: "Robert Kingsley",
    tag: "Markets",
  },
];

type LiveFeedProps = {
  initialUpdates: LiveUpdate[];
};

export function LiveFeed({ initialUpdates }: LiveFeedProps) {
  const [updates, setUpdates] = React.useState<LiveUpdate[]>(initialUpdates);
  const [countdown, setCountdown] = React.useState(REFRESH_INTERVAL);
  const [lastRefreshed, setLastRefreshed] = React.useState(0); // seconds ago
  const [newIds, setNewIds] = React.useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [viewers, setViewers] = React.useState<number | null>(null);
  const [socketConnected, setSocketConnected] = React.useState(false);
  const poolIndex = React.useRef(0);

  // Prepend a new update with the "New" badge highlight
  function prependUpdate(update: LiveUpdate) {
    setUpdates((prev) => [update, ...prev]);
    setNewIds((prev) => new Set(prev).add(update.id));
    setLastRefreshed(0);
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
    setTimeout(() => {
      setNewIds((prev) => {
        const copy = new Set(prev);
        copy.delete(update.id);
        return copy;
      });
    }, 4000);
  }

  // Connect to the live-blog WebSocket service (socket.io on port 3003 via gateway)
  React.useEffect(() => {
    let socket: import("socket.io-client").Socket | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { io } = await import("socket.io-client");
        socket = io("/?XTransformPort=3003", {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 3,
          timeout: 5000,
        });
        socket.on("connect", () => {
          if (!cancelled) setSocketConnected(true);
        });
        socket.on("disconnect", () => {
          if (!cancelled) setSocketConnected(false);
        });
        socket.on("viewer-count", (count: number) => {
          if (!cancelled) setViewers(count);
        });
        socket.on("live-update", (data: Partial<LiveUpdate> & { title: string; body: string }) => {
          if (cancelled) return;
          const update: LiveUpdate = {
            id: data.id || `ws-${Date.now()}`,
            time: data.time || "just now",
            timestamp: data.timestamp || new Date().toISOString(),
            title: data.title,
            body: data.body,
            author: data.author || "The Daily Post",
            tag: data.tag,
            highlight: data.highlight,
          };
          prependUpdate(update);
          setCountdown(REFRESH_INTERVAL);
        });
      } catch {
        /* socket.io-client unavailable — fall back to simulated refresh */
      }
    })();

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
    };
  }, []);

  // Simulated auto-refresh ticker (used when no socket update arrives)
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          // Auto-refresh triggered — only simulate if socket is not connected
          if (!socketConnected) {
            doRefresh();
          }
          return REFRESH_INTERVAL;
        }
        return c - 1;
      });
      setLastRefreshed((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [socketConnected]);

  function doRefresh() {
    const next = incomingPool[poolIndex.current % incomingPool.length];
    poolIndex.current += 1;
    const id = `incoming-${Date.now()}`;
    prependUpdate({
      ...next,
      id,
      timestamp: new Date().toISOString(),
    });
  }

  function handleManualRefresh() {
    setCountdown(REFRESH_INTERVAL);
    doRefresh();
  }

  // Use insertion order (newest first) — initial data is already sorted, new updates prepended
  const feed = updates;

  return (
    <>
      {/* Live feed header with refresh controls */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b-2 border-black pb-3 dark:border-white">
        <Radio className="h-4 w-4 text-red-700" />
        <h2 className="font-headline text-2xl font-black text-black dark:text-white">
          Latest updates
        </h2>
        <span className="ml-auto flex items-center gap-2 font-sans text-xs text-stone-500 dark:text-stone-400">
          {viewers !== null && viewers > 0 && (
            <>
              <span className="flex items-center gap-1 rounded-full border border-stone-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:border-stone-700 dark:text-stone-400">
                <Users className="h-3 w-3" />
                <span className="tabular-nums">{viewers}</span> reading
              </span>
              <span className="text-stone-300 dark:text-stone-700">·</span>
            </>
          )}
          <span className="tabular-nums">{feed.length} posts</span>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <span className="tabular-nums">
            {lastRefreshed === 0 ? "just refreshed" : `${lastRefreshed}s ago`}
          </span>
        </span>
      </div>

      {/* Refresh bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-stone-200 bg-stone-50 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2 font-sans text-[11px] text-stone-600 dark:text-stone-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-700 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-700" />
          </span>
          <span className="font-bold uppercase tracking-wider text-red-700">Live</span>
          <span>Auto-refresh in</span>
          <span className="tabular-nums font-bold text-stone-900 dark:text-stone-100">
            {countdown}s
          </span>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 transition-colors hover:text-red-700 disabled:opacity-50 dark:text-stone-300 dark:hover:text-red-500"
          aria-label="Refresh updates now"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          Refresh now
        </button>
      </div>

      {/* Timeline */}
      <ol className="relative">
        {/* vertical line */}
        <div className="absolute bottom-0 left-[7px] top-2 w-px bg-stone-300 dark:bg-stone-700" />
        {feed.map((u) => {
          const isNew = newIds.has(u.id);
          return (
            <li
              key={u.id}
              className={cn("relative pb-8 pl-10 last:pb-0", isNew && "reveal-up")}
            >
              {/* dot */}
              <span
                className={
                  u.highlight
                    ? "absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-700 ring-4 ring-red-100 dark:ring-red-950"
                    : "absolute left-[3px] top-2 h-2.5 w-2.5 rounded-full border-2 border-stone-400 bg-white dark:border-stone-600 dark:bg-stone-900"
                }
              />
              <div
                className={
                  u.highlight
                    ? "rounded-sm border-l-4 border-red-700 bg-red-50/60 p-4 dark:bg-red-950/20"
                    : ""
                }
              >
                <div className="flex items-center gap-2 font-sans text-[11px]">
                  <span className="font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                    {u.time}
                  </span>
                  {u.tag && (
                    <span className="rounded-sm bg-stone-200 px-1.5 py-0.5 font-bold uppercase tracking-wider text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      {u.tag}
                    </span>
                  )}
                  {u.highlight && (
                    <span className="rounded-sm bg-red-700 px-1.5 py-0.5 font-bold uppercase tracking-wider text-white">
                      Key moment
                    </span>
                  )}
                  {isNew && (
                    <span className="flex items-center gap-1 rounded-sm bg-green-700 px-1.5 py-0.5 font-bold uppercase tracking-wider text-white">
                      <Plus className="h-2.5 w-2.5" />
                      New
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 font-headline text-xl font-bold leading-snug text-black dark:text-white">
                  {u.title}
                </h3>
                <p className="mt-1.5 font-body text-[15px] leading-relaxed text-stone-700 dark:text-stone-300">
                  {u.body}
                </p>
                <p className="mt-2 font-sans text-[11px] text-stone-500 dark:text-stone-400">
                  — {u.author}, The Daily Post
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

export default LiveFeed;
