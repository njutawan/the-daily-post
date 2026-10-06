"use client";

import * as React from "react";
import { Radio, Users } from "lucide-react";

export function LiveFeed() {
  const [viewers, setViewers] = React.useState<number | null>(null);

  // The live-blog service currently reports audience counts only. Editorial
  // publishing is not connected, so this component never accepts feed events.
  React.useEffect(() => {
    let socket: import("socket.io-client").Socket | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { io } = await import("socket.io-client");
        if (cancelled) return;
        socket = io("/?XTransformPort=3003", {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 3,
          timeout: 5000,
        });
        socket.on("viewer-count", (count: number) => {
          if (!cancelled && Number.isFinite(count) && count >= 0) {
            setViewers(count);
          }
        });
      } catch {
        // A failed audience-count connection does not change the empty feed.
      }
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b-2 border-black pb-3 dark:border-white">
        <Radio className="h-4 w-4 text-stone-500" />
        <h2 className="font-headline text-2xl font-black text-black dark:text-white">
          Latest updates
        </h2>
        <span className="ml-auto flex items-center gap-2 font-sans text-xs text-stone-500 dark:text-stone-400">
          {viewers !== null && viewers > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-stone-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-stone-600 dark:border-stone-700 dark:text-stone-400">
              <Users className="h-3 w-3" />
              <span className="tabular-nums">{viewers}</span> reading
            </span>
          )}
          <span className="tabular-nums">0 posts</span>
        </span>
      </div>

      <div className="border border-stone-200 bg-stone-50 px-5 py-8 text-center dark:border-stone-800 dark:bg-stone-900">
        <p className="font-headline text-xl font-bold text-stone-800 dark:text-stone-200">
          Live coverage is not available yet
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Editorial publishing for this feed has not been connected. Sample and automatically generated posts are intentionally disabled.
        </p>
      </div>
    </>
  );
}

export default LiveFeed;
