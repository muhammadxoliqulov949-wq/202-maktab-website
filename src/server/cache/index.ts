import { getEnv } from "@/server/config/env";
import { MemoryCacheProvider, type CacheProvider } from "@/server/cache/providers";
import { logger } from "@/server/observability/logger";
import { metrics } from "@/server/observability/metrics";

/** Process-wide cache singleton. Stateless app: memory cache is per-instance optimization. */
let provider: CacheProvider | null = null;

export function getCache(): CacheProvider {
  if (provider) return provider;
  const env = getEnv();
  if (env.CACHE_PROVIDER === "redis") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { RedisCacheProvider } = require("@/server/cache/providers") as typeof import("@/server/cache/providers");
      provider = new RedisCacheProvider();
    } catch {
      logger.warn("CACHE_PROVIDER=redis requested but unavailable — falling back to memory cache");
      provider = new MemoryCacheProvider();
    }
  } else {
    provider = new MemoryCacheProvider();
  }
  return provider;
}

/** Canonical cache keys + invalidation prefixes. Phase 3 admin reuses invalidate*(). */
export const cacheKeys = {
  siteConfig: () => "v1:site-config",
  stats: () => "v1:stats",
  features: () => "v1:features",
  facilities: () => "v1:facilities",
  faqs: () => "v1:faqs",
  quickLinks: () => "v1:quick-links",
  contactInfo: () => "v1:contact-info",
  newsList: (hash: string) => `v1:news:list:${hash}`,
  newsItem: (slug: string) => `v1:news:item:${slug}`,
  teamList: (hash: string) => `v1:team:list:${hash}`,
  teamItem: (id: string) => `v1:team:item:${id}`,
  galleryList: (hash: string) => `v1:gallery:list:${hash}`,
  galleryItem: (id: string) => `v1:gallery:item:${id}`,
};

export const cachePrefixes = {
  news: "v1:news",
  newsList: "v1:news:list",
  team: "v1:team",
  gallery: "v1:gallery",
  static: "v1:static",
};

/** Cache-aside helper: measures hit/miss and reports observability counters. */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
  const cache = getCache();
  const entry = await cache.get<T>(key);
  if (entry.hit) {
    metrics.increment("cache_hits_total");
    return { value: entry.value as T, hit: true };
  }
  metrics.increment("cache_misses_total");
  const value = await loader();
  await cache.set(key, value, ttlMs);
  return { value, hit: false };
}
