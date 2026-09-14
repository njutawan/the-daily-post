import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/weather — current weather for the visitor's location.
 *
 * Location detection (in priority order):
 *   1. Vercel geo headers (x-vercel-ip-city, x-vercel-ip-latitude, …) —
 *      free, no API call, available on every Vercel deployment.
 *   2. ipwho.is free IP geolocation API — HTTPS, no API key, ~10k req/day.
 *   3. Fallback: default location from WEATHER_LOCATION env var.
 *
 * Weather provider (set ONE in .env):
 *   - OPENWEATHER_API_KEY → OpenWeatherMap
 *   - WEATHERAPI_KEY      → WeatherAPI
 *   If neither is set, returns mock 72°F sunny data with the visitor's
 *   real city name (so the widget still feels personalized even without
 *   a weather API key).
 *
 * Both geolocation + weather results are cached in-memory for 10 minutes
 * per IP / per location to stay within free-tier rate limits.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

type Condition = "sunny" | "cloudy" | "rain" | "snow" | "storm" | "windy" | "fog";

interface WeatherResponse {
  temp: number;
  condition: Condition;
  location: string;
  description?: string;
  humidity?: number;
  windSpeed?: number;
  fetchedAt: string;
  source: "openweather" | "weatherapi" | "mock";
}

interface GeoLocation {
  city: string;
  lat?: number;
  lon?: number;
  country?: string;
  countryCode?: string;
}

// ─────────────────────────────────────────────────────────────────────
// In-memory caches (10-minute TTL)
// ─────────────────────────────────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const geoCache = new Map<string, { loc: GeoLocation; expires: number }>();
const weatherCache = new Map<string, { data: WeatherResponse; expires: number }>();

// ─────────────────────────────────────────────────────────────────────
// IP + geolocation
// ─────────────────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  // Vercel / standard proxy headers. The first IP in X-Forwarded-For
  // is the original client; subsequent entries are intermediate proxies.
  const fwd = req.headers.get("x-forwarded-for") || "";
  const realIp = req.headers.get("x-real-ip") || "";
  const vercelFwd = req.headers.get("x-vercel-forwarded-for") || "";
  return fwd.split(",")[0].trim() || realIp.trim() || vercelFwd.split(",")[0].trim() || "";
}

function getVercelGeo(req: Request): GeoLocation | null {
  const city = req.headers.get("x-vercel-ip-city");
  const lat = req.headers.get("x-vercel-ip-latitude");
  const lon = req.headers.get("x-vercel-ip-longitude");
  const country = req.headers.get("x-vercel-ip-country");

  if (city || (lat && lon)) {
    return {
      city: city || "Your location",
      lat: lat ? parseFloat(lat) : undefined,
      lon: lon ? parseFloat(lon) : undefined,
      country: country || undefined,
    };
  }
  return null;
}

async function getIpGeo(ip: string): Promise<GeoLocation | null> {
  if (!ip || ip === "unknown") return null;

  // Check cache
  const cached = geoCache.get(ip);
  if (cached && cached.expires > Date.now()) {
    return cached.loc;
  }

  try {
    // ipwho.is — free HTTPS IP geolocation, no API key needed.
    const url = `https://ipwho.is/${ip}?fields=success,city,latitude,longitude,country,country_code`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`ipwho.is HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "geolocation failed");

    const loc: GeoLocation = {
      city: data.city || "Unknown",
      lat: data.latitude,
      lon: data.longitude,
      country: data.country,
      countryCode: data.country_code,
    };

    // Cache
    geoCache.set(ip, { loc, expires: Date.now() + CACHE_TTL });
    // Prevent unbounded growth
    if (geoCache.size > 500) {
      const oldest = [...geoCache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
      if (oldest) geoCache.delete(oldest[0]);
    }
    return loc;
  } catch (err) {
    logger.error({ err, ip }, "[/api/weather] IP geolocation failed");
    return null;
  }
}

function getDefaultLocation(): GeoLocation {
  const raw = process.env.WEATHER_LOCATION || "Washington,DC,US";
  const parts = raw.split(",");
  const label = parts.length > 1 ? parts[1].trim().slice(0, 4).toUpperCase() : parts[0].slice(0, 12);
  return { city: label, country: parts[2]?.trim() || "US" };
}

// ─────────────────────────────────────────────────────────────────────
// Weather condition mappers
// ─────────────────────────────────────────────────────────────────────

function owmCondition(code: number): Condition {
  if (code >= 200 && code < 300) return "storm";
  if (code >= 300 && code < 600) return "rain";
  if (code >= 600 && code < 700) return "snow";
  if (code >= 700 && code < 800) return "fog";
  if (code === 800) return "sunny";
  if (code <= 802) return "cloudy";
  return "cloudy";
}

function wapiCondition(code: number): Condition {
  if (code === 1000) return "sunny";
  if (code === 1003 || code === 1006) return "cloudy";
  if (code >= 1009 && code <= 1030) return "cloudy";
  if (code >= 1063 && code <= 1207) return "rain";
  if (code >= 1210 && code <= 1235) return "snow";
  if (code >= 1240 && code <= 1252) return "rain";
  if (code >= 1255 && code <= 1282) return "snow";
  if (code >= 1273 && code <= 1282) return "storm";
  if (code === 1135 || code === 1147) return "fog";
  return "cloudy";
}

// ─────────────────────────────────────────────────────────────────────
// Weather fetchers
// ─────────────────────────────────────────────────────────────────────

async function fetchOpenWeather(loc: GeoLocation): Promise<WeatherResponse> {
  const key = process.env.OPENWEATHER_API_KEY!;
  // Use lat/lon if available (more accurate), otherwise city query.
  const url = loc.lat && loc.lon
    ? `https://api.openweathermap.org/data/2.5/weather?lat=${loc.lat}&lon=${loc.lon}&units=imperial&appid=${key}`
    : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(loc.city)}&units=imperial&appid=${key}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OpenWeatherMap ${res.status}`);
  const data = await res.json();
  const code = data.weather?.[0]?.id ?? 803;
  const windSpeed = data.wind?.speed ?? 0;
  let condition = owmCondition(code);
  if (windSpeed > 20 && condition === "cloudy") condition = "windy";

  return {
    temp: Math.round(data.main?.temp ?? 72),
    condition,
    location: loc.city,
    description: data.weather?.[0]?.description ?? "",
    humidity: data.main?.humidity,
    windSpeed,
    fetchedAt: new Date().toISOString(),
    source: "openweather",
  };
}

async function fetchWeatherAPI(loc: GeoLocation): Promise<WeatherResponse> {
  const key = process.env.WEATHERAPI_KEY!;
  const query = loc.lat && loc.lon ? `${loc.lat},${loc.lon}` : loc.city;
  const url = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(query)}&aqi=no`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`WeatherAPI ${res.status}`);
  const data = await res.json();
  const code = data.current?.condition?.code ?? 1003;
  const windSpeed = data.current?.wind_mph ?? 0;
  let condition = wapiCondition(code);
  if (windSpeed > 20 && condition === "cloudy") condition = "windy";

  return {
    temp: Math.round(data.current?.temp_f ?? 72),
    condition,
    location: loc.city,
    description: data.current?.condition?.text ?? "",
    humidity: data.current?.humidity,
    windSpeed,
    fetchedAt: new Date().toISOString(),
    source: "weatherapi",
  };
}

function mockWeather(loc: GeoLocation): WeatherResponse {
  return {
    temp: 72,
    condition: "sunny",
    location: loc.city,
    description: "clear sky (mock)",
    fetchedAt: new Date().toISOString(),
    source: "mock",
  };
}

// ─────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Rate limit: 30 req/min per IP (weather is cached 10 min, no need for frequent polling).
  const limited = rateLimitResponse(req, { max: 30, windowMs: 60_000 });
  if (limited) return new NextResponse(limited.body, { status: 429, headers: limited.headers });

  // 1. Resolve the visitor's location via IP geolocation.
  let loc: GeoLocation = getDefaultLocation();
  const vercelGeo = getVercelGeo(req);
  if (vercelGeo) {
    loc = vercelGeo;
  } else {
    const ip = getClientIp(req);
    const ipGeo = await getIpGeo(ip);
    if (ipGeo) loc = ipGeo;
  }

  // 2. Check weather cache for this location.
  const cacheKey = `${loc.city}:${loc.lat ?? 0}:${loc.lon ?? 0}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=600, s-maxage=600" },
    });
  }

  // 3. Fetch real weather if an API key is configured, else mock.
  const hasOWM = Boolean(process.env.OPENWEATHER_API_KEY);
  const hasWAPI = Boolean(process.env.WEATHERAPI_KEY);

  try {
    const weather = hasOWM
      ? await fetchOpenWeather(loc)
      : hasWAPI
        ? await fetchWeatherAPI(loc)
        : mockWeather(loc);

    // Cache the result.
    weatherCache.set(cacheKey, { data: weather, expires: Date.now() + CACHE_TTL });
    if (weatherCache.size > 200) {
      const oldest = [...weatherCache.entries()].sort((a, b) => a[1].expires - b[1].expires)[0];
      if (oldest) weatherCache.delete(oldest[0]);
    }

    return NextResponse.json(weather, {
      headers: { "Cache-Control": "public, max-age=600, s-maxage=600" },
    });
  } catch (err) {
    logger.error({ err, hasOWM, hasWAPI }, "[/api/weather] fetch failed");
    // Fall back to mock with the real location so the widget doesn't break.
    const fallback = mockWeather(loc);
    return NextResponse.json(
      { ...fallback, error: "Weather API unavailable, showing mock data" },
      {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
      }
    );
  }
}
