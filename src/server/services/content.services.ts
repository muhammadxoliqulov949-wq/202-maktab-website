import { CACHE_TTL } from "@/server/config/env";
import { cached, cacheKeys, cachePrefixes, getCache } from "@/server/cache";
import { repos } from "@/server/repositories";
import { AppError } from "@/server/errors/AppError";
import type { NewsQuery, TeamQuery, GalleryQuery } from "@/server/repositories/interfaces";
import { createHash } from "node:crypto";

/** Stable query hash so cache keys are bounded. */
function hashQuery(q: Record<string, unknown>): string {
  const stable = Object.keys(q)
    .filter((k) => q[k] !== undefined && q[k] !== "")
    .sort()
    .map((k) => `${k}=${String(q[k])}`)
    .join("&");
  return createHash("sha1").update(stable).digest("base64url").slice(0, 16);
}

/* ---------------- News ---------------- */

export const newsService = {
  async list(q: NewsQuery) {
    const key = cacheKeys.newsList(hashQuery(q as Record<string, unknown>));
    return cached(key, CACHE_TTL.newsList * 1000, () => repos().news.list(q));
  },
  async bySlug(slug: string) {
    return cached(cacheKeys.newsItem(slug), CACHE_TTL.newsItem * 1000, async () => {
      const item = await repos().news.bySlug(slug);
      if (!item) throw AppError.notFound("News article not found");
      return item;
    });
  },
};

/* ---------------- Team ---------------- */

export const teamService = {
  async list(q: TeamQuery) {
    const key = cacheKeys.teamList(hashQuery(q as Record<string, unknown>));
    return cached(key, CACHE_TTL.teamList * 1000, () => repos().team.list(q));
  },
  async byId(id: string) {
    return cached(cacheKeys.teamItem(id), CACHE_TTL.teamItem * 1000, async () => {
      const item = await repos().team.byId(id);
      if (!item) throw AppError.notFound("Team member not found");
      return item;
    });
  },
};

/* ---------------- Gallery ---------------- */

export const galleryService = {
  async list(q: GalleryQuery) {
    const key = cacheKeys.galleryList(hashQuery(q as Record<string, unknown>));
    return cached(key, CACHE_TTL.galleryList * 1000, () => repos().gallery.list(q));
  },
  async byId(id: string) {
    return cached(cacheKeys.galleryItem(id), CACHE_TTL.galleryItem * 1000, async () => {
      const item = await repos().gallery.byId(id);
      if (!item) throw AppError.notFound("Gallery item not found");
      return item;
    });
  },
};

/* ---------------- Static content ---------------- */

export const contentService = {
  siteConfig: () => cached(cacheKeys.siteConfig(), CACHE_TTL.siteConfig * 1000, () => repos().content.siteConfig()),
  stats: () => cached(cacheKeys.stats(), CACHE_TTL.stats * 1000, () => repos().content.stats()),
  features: () => cached(cacheKeys.features(), CACHE_TTL.features * 1000, () => repos().content.features()),
  facilities: () => cached(cacheKeys.facilities(), CACHE_TTL.facilities * 1000, () => repos().content.facilities()),
  faqs: () => cached(cacheKeys.faqs(), CACHE_TTL.faqs * 1000, () => repos().content.faqs()),
  quickLinks: () => cached(cacheKeys.quickLinks(), CACHE_TTL.quickLinks * 1000, () => repos().content.quickLinks()),
  contactInfo: () => cached(cacheKeys.contactInfo(), CACHE_TTL.contactInfo * 1000, () => repos().content.contactInfo()),
};

/* ---------------- Targeted invalidation (admin mutation entry points) ----------------
 * Each mutation invalidates ONLY the affected namespace — never the whole cache.
 */

export const cacheInvalidation = {
  async invalidateNews() {
    const n = await getCache().delByPrefix(cachePrefixes.news);
    return { prefix: cachePrefixes.news, deleted: n };
  },
  async invalidateNewsItem(slug: string) {
    await getCache().del(cacheKeys.newsItem(slug));
    return { key: cacheKeys.newsItem(slug) };
  },
  async invalidateTeam() {
    const n = await getCache().delByPrefix(cachePrefixes.team);
    return { prefix: cachePrefixes.team, deleted: n };
  },
  async invalidateGallery() {
    const n = await getCache().delByPrefix(cachePrefixes.gallery);
    return { prefix: cachePrefixes.gallery, deleted: n };
  },
  async invalidateFaq() {
    await getCache().del(cacheKeys.faqs());
    return { key: cacheKeys.faqs() };
  },
  async invalidateSiteConfig() {
    await getCache().del(cacheKeys.siteConfig());
    return { key: cacheKeys.siteConfig() };
  },
  async invalidateStats() {
    await getCache().del(cacheKeys.stats());
    return { key: cacheKeys.stats() };
  },
  async invalidateFeatures() {
    await getCache().del(cacheKeys.features());
    return { key: cacheKeys.features() };
  },
  async invalidateFacilities() {
    await getCache().del(cacheKeys.facilities());
    return { key: cacheKeys.facilities() };
  },
  async invalidateQuickLinks() {
    await getCache().del(cacheKeys.quickLinks());
    return { key: cacheKeys.quickLinks() };
  },
  async invalidateContactInfo() {
    await getCache().del(cacheKeys.contactInfo());
    return { key: cacheKeys.contactInfo() };
  },
};
