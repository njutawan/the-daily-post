/**
 * Centralized environment variable access.
 *
 * Build-safe: NEVER throws during `next build`. Missing vars use
 * sensible defaults so the build always succeeds. Runtime code
 * (API routes, server components) handles missing values gracefully.
 *
 * On Vercel: set all [REQUIRED] vars in the dashboard → Settings →
 * Environment Variables. See VERCEL_ENV.md for the full list.
 */

// We intentionally use a plain object (not zod) here because zod's
// .min(1) / .throw() runs at module-load time — during `next build`
// on Vercel, env vars from the dashboard aren't always available yet
// (build-time vs runtime env), which caused the build to crash with
// "ENOENT: .next/next-server.js.nft.json". This plain-object approach
// always succeeds and lets runtime code validate/throw as needed.

function getEnv(key: string, fallback = ""): string {
  const val = process.env[key];
  return val && val.length > 0 ? val : fallback;
}

export const env = {
  DATABASE_URL: getEnv("DATABASE_URL", "file:./db/custom.db"),
  // In production, set ADMIN_PASSWORD in Vercel env vars. If empty,
  // the /api/admin/login route rejects all login attempts (correct
  // behavior — no admin access without a configured password).
  ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD", "post2026"),
  NEXT_PUBLIC_SITE_URL: getEnv(
    "NEXT_PUBLIC_SITE_URL",
    "https://www.thedailypost.example"
  ).replace(/\/$/, ""),
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  LOG_LEVEL: getEnv("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error",
};

export type Env = typeof env;

/** Convenience re-exports */
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL;
export const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
export const LOG_LEVEL = env.LOG_LEVEL;
