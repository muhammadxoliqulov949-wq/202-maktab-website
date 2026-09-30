import { z } from "zod";

/**
 * Environment configuration — validated once at server startup
 * (see src/instrumentation.ts). Never expose values of secrets in responses.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  /** Comma-separated list of origins allowed to call the API cross-origin. Empty = same-origin only. */
  APP_ORIGIN: z.string().optional(),
  API_ORIGIN: z.string().optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  /** memory | redis (redis requires the ioredis dependency in Phase 3; falls back to memory with a warning) */
  CACHE_PROVIDER: z.enum(["memory", "redis"]).default("memory"),
  REDIS_URL: z.string().optional(),

  METRICS_ENABLED: z.coerce.boolean().default(false),
  API_DOCS_ENABLED: z.coerce.boolean().optional(),

  /** body size cap for JSON submissions (bytes) */
  CONTACT_MAX_BYTES: z.coerce.number().int().positive().default(8 * 1024),

  /** rate limits (requests per window) */
  RATE_LIMIT_PUBLIC_READ_MAX: z.coerce.number().int().positive().default(240),
  RATE_LIMIT_PUBLIC_READ_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_SEARCH_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_SEARCH_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_CONTACT_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_CONTACT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  /** spam filter: null | heuristic */
  SPAM_FILTER: z.enum(["null", "heuristic"]).default("heuristic"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Startup validation failure — fail loudly and safely (no secret values).
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration → ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Centralized cache TTLs (seconds) — never hard-code TTLs in controllers. */
export const CACHE_TTL = {
  siteConfig: 1800,
  stats: 1800,
  features: 1800,
  facilities: 1800,
  faqs: 1800,
  quickLinks: 1800,
  contactInfo: 1800,
  teamList: 600,
  teamItem: 900,
  newsList: 120,
  newsItem: 900,
  galleryList: 300,
  galleryItem: 600,
} as const;

/** HTTP cache-control mapping for public read-only resources. */
export function cacheControlFor(ttlSec: number): string {
  // CDN-friendly: short browser cache + longer shared cache + stale grace.
  const maxAge = Math.min(ttlSec, 60);
  const sMaxAge = ttlSec;
  return `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${Math.round(ttlSec / 2)}`;
}

export const SECURITY_POLICY = {
  /** Strict contact policy runs at the route layer (see RATE_LIMIT_CONTACT_*). */
  maxContactBodyBytes: () => getEnv().CONTACT_MAX_BYTES,
} as const;
