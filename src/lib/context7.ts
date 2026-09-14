/**
 * Context7 client — server-side wrapper for the Context7 HTTP API.
 *
 * Context7 (https://github.com/upstash/context7) provides up-to-date,
 * version-specific documentation for libraries, straight from the
 * source. This wrapper exposes two operations:
 *
 *   1. searchLibraries(query) → search the index (PUBLIC, no API key
 *      needed, rate-limited per-IP)
 *   2. getLibraryDocs(libraryId) → fetch the actual docs (REQUIRES an
 *      API key starting with "ctx7sk" — get one at
 *      https://context7.com/dashboard)
 *
 * Set CONTEXT7_API_KEY in .env to enable docs fetch. Without a key,
 * search still works but docs fetch returns a friendly error.
 *
 * API endpoints (discovered via the Context7 dashboard):
 *   - GET https://context7.com/api/v1/search?query=<q>&limit=<n>
 *   - GET https://context7.com/api/v1/context?libraryId=<id>&topic=<t>&tokens=<n>
 *
 * The `libraryId` for the context endpoint does NOT include the leading
 * "/" — pass `vercel/next.js`, not `/vercel/next.js`. (The search
 * endpoint returns IDs WITH the leading "/", so we strip it before
 * calling the context endpoint.)
 *
 * This module is server-only (uses fetch + the API key env var).
 */

import { logger } from "@/lib/logger";

const API_BASE = "https://context7.com/api/v1";

export interface Context7Library {
  id: string;          // Context7 library ID, e.g. "/vercel/next.js"
  name: string;        // Display name, e.g. "Next.js"
  description?: string;
  version?: string;
  branch?: string;
  trustScore?: number;
  totalSnippets?: number;
  totalTokens?: number;
  stars?: number;
  lastUpdateDate?: string;
  versions?: string[];
  sourceUrls?: string[];
}

export interface Context7SearchResult {
  results: Context7Library[];
  total: number;
}

export interface Context7DocsResult {
  libraryId: string;
  topic?: string;
  /** The raw documentation snippets (markdown text). */
  content: string;
  /** Number of tokens the response represents (for budget tracking). */
  tokens?: number;
  /** When the docs were last updated on the Context7 index. */
  lastUpdated?: string;
  /** The snippet objects (richer form, includes snippet + source URL). */
  snippets?: Array<{
    content: string;
    sourceUrl?: string;
    snippet?: string;
  }>;
}

/**
 * Whether a Context7 API key is configured. With a key, the docs fetch
 * endpoint works. Without, only search works (docs returns 401).
 */
export function hasContext7ApiKey(): boolean {
  const key = process.env.CONTEXT7_API_KEY;
  return Boolean(key && key.startsWith("ctx7sk"));
}

function authHeaders(): Record<string, string> {
  const key = process.env.CONTEXT7_API_KEY;
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

/**
 * Search the Context7 index for libraries matching the query.
 *
 * Public endpoint — works without an API key (rate-limited per-IP).
 *
 * @param query e.g. "next.js" or "react server components"
 * @param limit max results to return (default 10, max 20)
 */
export async function searchLibraries(
  query: string,
  limit = 10
): Promise<Context7SearchResult> {
  if (!query || query.trim().length < 2) {
    return { results: [], total: 0 };
  }

  const url = new URL(`${API_BASE}/search`);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("limit", String(Math.min(limit, 20)));

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...authHeaders(),
      },
      // Cache the search result for 1 hour — library metadata rarely
      // changes within an hour and the search endpoint is rate-limited.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      logger.error(
        { status: res.status, query },
        "[context7] search failed"
      );
      return { results: [], total: 0 };
    }

    const data = await res.json();
    const arr: Context7Library[] = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.libraries)
          ? data.libraries
          : [];

    return {
      results: arr.slice(0, limit),
      total: arr.length,
    };
  } catch (err) {
    logger.error({ err, query }, "[context7] search threw");
    return { results: [], total: 0 };
  }
}

/**
 * Fetch documentation for a specific library.
 *
 * REQUIRES an API key (set CONTEXT7_API_KEY in .env). Without a key,
 * returns a result with an error message instead of throwing.
 *
 * @param libraryId the Context7 library ID (e.g. "/vercel/next.js"
 *        WITH the leading "/" — we strip it internally to match the
 *        API's expected format `username/library[/tag]`)
 * @param topic optional topic filter (e.g. "app router" or "middleware")
 * @param tokens max tokens of docs to return (default 10000, max 50000)
 */
export async function getLibraryDocs(
  libraryId: string,
  topic?: string,
  tokens = 10000
): Promise<Context7DocsResult | null> {
  if (!libraryId) {
    return null;
  }

  // Check API key first — the /context endpoint returns 401 without one.
  if (!hasContext7ApiKey()) {
    return {
      libraryId,
      topic,
      content:
        "## Context7 API key required\n\n" +
        "To fetch library documentation, set `CONTEXT7_API_KEY` in your `.env` file.\n\n" +
        "Get a free API key at https://context7.com/dashboard — it starts with the `ctx7sk` prefix.\n\n" +
        "Without a key, only library search works (which is how you got here). The docs fetch endpoint requires authentication.",
      tokens: 0,
    };
  }

  // Strip the leading "/" — the API expects `vercel/next.js`, not
  // `/vercel/next.js`. The search endpoint returns IDs WITH the slash,
  // so we normalize here.
  const normalizedId = libraryId.replace(/^\//, "");

  const url = new URL(`${API_BASE}/context`);
  url.searchParams.set("libraryId", normalizedId);
  if (topic && topic.trim()) {
    url.searchParams.set("topic", topic.trim());
  }
  url.searchParams.set("tokens", String(Math.min(tokens, 50000)));

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...authHeaders(),
      },
      // Docs change infrequently — cache for 30 minutes.
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      let errMsg = `Context7 API returned ${res.status}`;
      try {
        const errBody = await res.json();
        if (errBody?.message) errMsg = errBody.message;
      } catch {
        // ignore parse error
      }
      logger.error(
        { status: res.status, libraryId: normalizedId, topic, errMsg },
        "[context7] getDocs failed"
      );
      return {
        libraryId,
        topic,
        content: `## Documentation fetch failed\n\n${errMsg}\n\nThe Context7 API may be rate-limited or the library ID may be incorrect. Try again in a few minutes.`,
        tokens: 0,
      };
    }

    const data = await res.json();

    // Normalize the response shape — Context7 returns different shapes
    // depending on the API version.
    const snippets: Context7DocsResult["snippets"] = Array.isArray(data.snippets)
      ? data.snippets
      : Array.isArray(data.results)
        ? data.results
        : undefined;

    // Build a flat markdown string from snippets (or use the content
    // field directly if the API returned a single string).
    let content = "";
    if (typeof data.content === "string") {
      content = data.content;
    } else if (snippets && snippets.length > 0) {
      content = snippets
        .map((s) => {
          const text = s.content || s.snippet || "";
          const source = s.sourceUrl ? `\n[source: ${s.sourceUrl}]` : "";
          return text + source;
        })
        .join("\n\n---\n\n");
    } else if (typeof data.markdown === "string") {
      content = data.markdown;
    } else if (typeof data.text === "string") {
      content = data.text;
    }

    return {
      libraryId,
      topic,
      content,
      tokens: data.tokens ?? data.usage?.tokens,
      lastUpdated: data.lastUpdated ?? data.updatedAt ?? data.lastUpdateDate,
      snippets,
    };
  } catch (err) {
    logger.error({ err, libraryId: normalizedId, topic }, "[context7] getDocs threw");
    return null;
  }
}

/**
 * Convenience: resolve a free-text library name to a single best-match
 * Context7 library ID. Returns null if no match.
 *
 * Equivalent to the MCP `resolve-library-id` tool.
 */
export async function resolveLibraryId(
  libraryName: string
): Promise<Context7Library | null> {
  const { results } = await searchLibraries(libraryName, 5);
  if (results.length === 0) return null;
  // Return the highest-trust match (or the first if trust scores are
  // missing — the API already sorts by relevance).
  return results.reduce((best, cur) =>
    (cur.trustScore ?? 0) > (best.trustScore ?? 0) ? cur : best
  );
}
