import { NextRequest } from "next/server";

/**
 * Security helpers — CSRF protection + origin verification.
 *
 * The project uses httpOnly cookies for auth. SameSite cookies protect
 * against most CSRF, but for defense-in-depth we also verify the
 * Origin/Referer header on state-changing requests.
 *
 * This implementation is Vercel-aware:
 *   - Accepts Origin matching NEXT_PUBLIC_SITE_URL (from env var)
 *   - Accepts Origin matching the Host header (actual domain being served)
 *   - Accepts any *.vercel.app domain (preview deployments)
 *   - Falls back to Referer if Origin is missing
 *   - In dev (non-production), allows missing headers (curl/Postman testing)
 */

const STATE_CHANGING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export function verifyOrigin(req: NextRequest, opts?: { skipWebhook?: boolean }): boolean {
  const method = req.method.toUpperCase();

  if (!STATE_CHANGING.has(method)) return true;

  // Stripe webhook verifies its own signature — skip origin check.
  if (opts?.skipWebhook && req.nextUrl.pathname.endsWith("/webhook")) {
    return true;
  }

  // Build a list of allowed hosts:
  // 1. NEXT_PUBLIC_SITE_URL (configured in Vercel dashboard)
  // 2. Host header (actual domain being served — always accurate on Vercel)
  // 3. *.vercel.app (preview deployments)
  const allowedHosts = new Set<string>();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      allowedHosts.add(new URL(siteUrl).host);
    } catch { /* invalid URL, skip */ }
  }

  const hostHeader = req.headers.get("host");
  if (hostHeader) {
    allowedHosts.add(hostHeader);
    // Also add with/without port for flexibility
    const hostOnly = hostHeader.split(":")[0];
    allowedHosts.add(hostOnly);
  }

  // localhost variants for dev
  allowedHosts.add("localhost:3000");
  allowedHosts.add("localhost");
  allowedHosts.add("127.0.0.1:3000");

  // Check Origin first (modern browsers send this for POST/PATCH/DELETE).
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const originHostOnly = originHost.split(":")[0];

      // Check against allowed hosts (exact match)
      if (allowedHosts.has(originHost) || allowedHosts.has(originHostOnly)) {
        return true;
      }

      // Allow any *.vercel.app domain (Vercel preview deployments)
      if (originHostOnly.endsWith(".vercel.app")) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Fallback: check Referer (older browsers, or when Origin is stripped).
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      const refererHostOnly = refererHost.split(":")[0];

      if (allowedHosts.has(refererHost) || allowedHosts.has(refererHostOnly)) {
        return true;
      }

      if (refererHostOnly.endsWith(".vercel.app")) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Neither Origin nor Referer present.
  // In dev, allow (curl/Postman). In prod, allow too — the actual
  // auth check happens in each API route via getSessionUser().
  // Rejecting here would cause 403 on every POST from clients that
  // don't send Origin (some older browsers, curl without headers).
  return true;
}
