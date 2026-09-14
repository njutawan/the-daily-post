import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  // Do NOT ignore build errors in production — surface them at build time.
  reactStrictMode: true,
  images: {
    // Generate AVIF (best compression) + WebP (best compatibility) versions.
    // AVIF is ~50% smaller than JPEG for the same quality.
    formats: ["image/avif", "image/webp"],
    // Only generate sizes we actually use — avoids generating 3840px images
    // nobody requests. The default Next config generates 6 sizes per image.
    deviceSizes: [640, 750, 1080, 1600],
    imageSizes: [16, 32, 48, 96, 256, 512],
    // Only allow our own image origins; the CDN pattern was for the old
    // remote-hosted images which are now downloaded to /public/images.
    remotePatterns: isProduction
      ? []
      : [
          {
            protocol: "https",
            hostname: "z-cdn.chatglm.cn",
          },
        ],
    // Cache optimized images for 30 days (default is only 60s in dev).
    // Re-optimization is wasted work — the source image doesn't change.
    minimumCacheTTL: 30 * 24 * 60 * 60,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // In development: allow all iframe embedding (for the preview panel
          // which may proxy through a different origin/port).
          // In production: block iframe embedding (security best practice).
          {
            key: "X-Frame-Options",
            value: isProduction ? "DENY" : "ALLOWALL",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' ws: wss:",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              // In dev: allow all iframe origins (preview panel uses a gateway proxy).
              // In prod: block all iframe embedding.
              isProduction ? "frame-ancestors 'none'" : "frame-ancestors *",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
