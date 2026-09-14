import Script from "next/script";
import { SITE_URL } from "@/lib/site";

/**
 * Analytics integration using Plausible (privacy-friendly, cookie-free).
 * Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN env var to enable.
 * Without it, this component renders nothing (no-op).
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  if (!domain) {
    return null;
  }

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}

export default Analytics;
