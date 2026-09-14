import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt — guides traditional search engine crawlers AND the new
 * generation of AI crawlers (GPTBot, OAI-Searchbot, PerplexityBot,
 * ClaudeBot, Google-Extended). Public content (including the /member
 * and /editorial sign-in pages) is allowed; private workspaces
 * (/admin, /api/admin/*, /api/auth/*) are disallowed.
 *
 * Sitemap reference helps crawlers discover all articles.
 */
export default function robots(): MetadataRoute.Robots {
  // Common allow/disallow for all AI + search crawlers — they all get
  // full access to public content (including the member & editorial
  // sign-in pages), no access to the private admin workspace.
  const publicAllow = ["/article/", "/category/", "/author/", "/", "/feed.xml", "/sitemap.xml", "/llms.txt", "/about", "/most-read", "/search", "/newsletters", "/subscribe", "/member", "/editorial"];
  const privateDisallow = ["/admin", "/api/admin", "/api/auth", "/api/member", "/api/subscriptions", "/api/reading-history", "/api/saved-articles", "/checkout"];

  const aiCrawlers = [
    "GPTBot",          // OpenAI / ChatGPT
    "OAI-Searchbot",   // OpenAI search (ChatGPT Search / AI Overviews)
    "PerplexityBot",   // Perplexity
    "ClaudeBot",       // Anthropic / Claude
    "Google-Extended", // Google AI Overviews
    "CCBot",           // Common Crawl (used by many open LLMs)
    "Bytespider",      // ByteDance / TikTok AI
    "Applebot",        // Apple Intelligence
  ];

  return {
    rules: [
      // Default: everyone gets public content, blocked from private areas.
      {
        userAgent: "*",
        allow: publicAllow,
        disallow: privateDisallow,
      },
      // Explicitly allow each named AI crawler so they know we want to be
      // indexed for AI answers (some sites block them — we don't).
      ...aiCrawlers.map((ua) => ({
        userAgent: ua,
        allow: publicAllow,
        disallow: privateDisallow,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL.replace(/^https?:\/\//, ""),
  };
}
