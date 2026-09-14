/**
 * The public-facing site URL, used for RSS feeds, sitemap, and OG metadata.
 * Set via NEXT_PUBLIC_SITE_URL env var in production; falls back to a placeholder
 * for local dev so links are still well-formed.
 */
import { SITE_URL as ENV_SITE_URL } from "@/lib/env";

export const SITE_URL = ENV_SITE_URL.replace(/\/$/, "");
export const SITE_NAME = "The Daily Post";
