"use client";

import * as React from "react";
import { Play, Pause, Loader2, Volume2, X, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

type ListenToArticleProps = {
  /** The article body text to synthesize. */
  text: string;
  title: string;
  className?: string;
};

export function ListenToArticle({ text, title, className }: ListenToArticleProps) {
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingFull, setLoadingFull] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0); // 0-100
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [mode, setMode] = React.useState<"preview" | "full">("preview");
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  async function generate(currentMode: "preview" | "full") {
    setLoading(true);
    if (currentMode === "full") setLoadingFull(true);
    setError(null);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: "tongtong", speed: 1.0, mode: currentMode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate audio");
      }
      const blob = await res.blob();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setProgress(0);
      setCurrentTime(0);
      setTimeout(async () => {
        if (audioRef.current) {
          try {
            await audioRef.current.play();
          } catch {
            /* autoplay may require user gesture — already handled by click */
          }
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setLoadingFull(false);
    }
  }

  function handlePlayClick() {
    if (audioUrl && audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      return;
    }
    generate(mode);
  }

  function handleStop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }

  function handleFullToggle() {
    const newMode = mode === "preview" ? "full" : "preview";
    setMode(newMode);
    // If currently playing or has audio, regenerate in the new mode
    if (audioUrl || loading) {
      handleStop();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      generate(newMode);
    }
  }

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function fmtTime(s: number): string {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className={cn(
        "rounded-sm border border-stone-200 bg-stone-50 px-3 py-3 dark:border-stone-800 dark:bg-stone-900",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={playing ? handleStop : handlePlayClick}
          disabled={loading}
          aria-label={playing ? "Stop audio" : "Listen to this article"}
          title={playing ? "Stop" : "Listen to this article"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-stone-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-stone-200"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
            <Volume2 className="h-3.5 w-3.5 text-red-700" />
            {loading
              ? loadingFull
                ? "Generating full article…"
                : "Generating audio…"
              : playing
                ? "Now playing"
                : "Listen to this article"}
          </div>
          {!loading && !audioUrl && (
            <p className="truncate font-sans text-[11px] text-stone-500 dark:text-stone-400">
              AI-narrated · {mode === "full" ? "full article" : "~2 min preview"}
            </p>
          )}
          {error && (
            <p className="truncate font-sans text-[11px] text-red-700">{error}</p>
          )}
        </div>

        {/* Full article toggle */}
        <button
          onClick={handleFullToggle}
          disabled={loading}
          title={mode === "full" ? "Switch to preview" : "Listen to the full article"}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-50",
            mode === "full"
              ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-stone-300 text-stone-600 hover:border-black hover:text-black dark:border-stone-700 dark:text-stone-400 dark:hover:border-white dark:hover:text-white"
          )}
        >
          <Headphones className="h-3 w-3" />
          Full
        </button>

        {playing && (
          <button
            onClick={handleStop}
            aria-label="Stop audio"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress bar (visible when audio loaded) */}
      {audioUrl && (
        <div className="mt-3 flex items-center gap-2">
          <span className="font-sans text-[10px] tabular-nums text-stone-500 dark:text-stone-400">
            {fmtTime(currentTime)}
          </span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-red-700 transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-sans text-[10px] tabular-nums text-stone-500 dark:text-stone-400">
            {fmtTime(duration)}
          </span>
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(100);
            setTimeout(() => setProgress(0), 1000);
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            if (a.duration) {
              setProgress((a.currentTime / a.duration) * 100);
              setCurrentTime(a.currentTime);
            }
          }}
          className="hidden"
        />
      )}
    </div>
  );
}

export default ListenToArticle;
