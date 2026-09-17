"use client";

import * as React from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  CloudFog,
} from "lucide-react";

/**
 * Weather widget for the header.
 *
 * Fetches from /api/weather which resolves the visitor's location via
 * IP geolocation (Vercel geo headers → ipwho.is fallback) and returns
 * real weather from OpenWeatherMap / WeatherAPI (or mock 72°F sunny
 * with the real city name if no weather API key is configured).
 *
 * The widget shows a neutral skeleton during SSR + initial hydration
 * (mounted guard prevents hydration mismatch), then fetches the
 * personalized weather on mount.
 */

type Condition = "sunny" | "cloudy" | "rain" | "snow" | "storm" | "windy" | "fog";

interface WeatherData {
  temp: number;
  condition: Condition;
  location: string;
  description?: string;
  source?: "openweather" | "weatherapi" | "mock";
}

const MOCK_WEATHER: WeatherData = {
  temp: 72,
  condition: "sunny",
  location: "—",
  description: "clear sky (mock)",
  source: "mock",
};

const ICONS: Record<Condition, typeof Sun> = {
  sunny: Sun,
  cloudy: Cloud,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
  windy: Wind,
  fog: CloudFog,
};

const ICON_COLORS: Record<Condition, string> = {
  sunny: "text-amber-500",
  cloudy: "text-stone-400",
  rain: "text-blue-500",
  snow: "text-sky-300",
  storm: "text-purple-500",
  windy: "text-teal-500",
  fog: "text-stone-400",
};

export function WeatherWidget() {
  const [mounted, setMounted] = React.useState(false);
  const [weather, setWeather] = React.useState<WeatherData>(MOCK_WEATHER);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setMounted(true);

    let cancelled = false;

    // Fetch weather from our server-side route. The route handles
    // IP geolocation + weather provider selection + caching.
    fetch("/api/weather", { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: WeatherData) => {
        if (!cancelled && data && typeof data.temp === "number") {
          setWeather(data);
        }
      })
      .catch(() => {
        // Silently fall back to mock — weather is non-critical.
        if (!cancelled) setWeather(MOCK_WEATHER);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // SSR skeleton — matches the widget's final width to avoid layout shift.
  if (!mounted || loading) {
    return (
      <span className="hidden items-center gap-1.5 font-sans text-[11px] text-stone-500 dark:text-stone-400 sm:flex">
        <Sun className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-bold tabular-nums">--°</span>
        <span className="text-stone-400">—</span>
      </span>
    );
  }

  const Icon = ICONS[weather.condition] || Sun;
  const colorClass = ICON_COLORS[weather.condition] || "text-amber-500";

  return (
    <span
      className="hidden items-center gap-1.5 font-sans text-[11px] text-stone-600 dark:text-stone-400 sm:flex"
      title={weather.description || weather.condition}
    >
      <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
      <span className="font-bold tabular-nums">{weather.temp}°</span>
      <span className="text-stone-400 dark:text-stone-500">{weather.location}</span>
    </span>
  );
}

export default WeatherWidget;
