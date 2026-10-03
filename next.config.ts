import type { NextConfig } from "next";

/**
 * Security headers + CDN-friendly caching.
 * - Hashed static assets (_next/static) and media: immutable, long-lived.
 * - HTML: must-revalidate (never cache stale HTML forever).
 * - CSP keeps videos, local fonts, OSM map iframe and theme script working.
 */
const isDev = process.env.NODE_ENV !== "production";

/**
 * CSP frame-ancestors: production standart — 'self'.
 * Dev/preview muhitida (masalan, sandbox iframe preview) `CSP_FRAME_ANCESTORS`
 * env o'zgaruvchisi orqali vaqtincha yumshatish mumkin — build/CI'ga ta'sir qilmaydi.
 */
const frameAncestors = process.env.CSP_FRAME_ANCESTORS ?? "'self'";

const csp = [
  "default-src 'self'",
  // Next.js App Router embeds inline bootstrap/RSC scripts in static HTML.
  // Nonce-based CSP requires per-request dynamic HTML — incompatible with our
  // CDN-cached static pages. Phase 4 security audit may revisit.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'", // utility classes use inline style attributes
  "img-src 'self' data:",
  "media-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.openstreetmap.org", // prototype map embed
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-ancestors ${frameAncestors}`,
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev preview proksisi (sandbox host) uchun ruxsat; production build'ga ta'sir qilmaydi.
  ...(isDev ? { allowedDevOrigins: ["*.e2b.app", "*.e2b.dev", "localhost", "127.0.0.1"] } : {}),
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 430, 640, 750, 828, 1080, 1200, 1440, 1920, 2560],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        // security headers everywhere (HTML, API, assets)
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // hashed build assets — immutable
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // media — content-addressed by filename; safe to cache long, revalidate daily
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/video/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        // HTML pages — never serve stale forever; revalidate each time
        source: "/((?!api/|_next/|images/|video/|scripts/).*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
