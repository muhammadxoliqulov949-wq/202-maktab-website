import { CACHE_TTL } from "@/server/config/env";
import { cached, cacheKeys, cachePrefixes, getCache } from "@/server/cache";
import { jsonNewsRepository } from "@/server/repositories/json/news.repository";
import { jsonTeamRepository } from "@/server/repositories/json/team.repository";
import { jsonGalleryRepository } from "@/server/repositories/json/gallery.repository";
import { jsonContentRepository } from "@/server/repositories/json/content.repository";
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
    return cached(key, CACHE_TTL.newsList * 1000, () => jsonNewsRepository.list(q));
  },
  async bySlug(slug: string) {
    return cached(cacheKeys.newsItem(slug), CACHE_TTL.newsItem * 1000, async () => {
      const item = await jsonNewsRepository.bySlug(slug);
      if (!item) throw AppError.notFound("News article not found");
      return item;
    });
  },
};

/* ---------------- Team ---------------- */

export const teamService = {
  async list(q: TeamQuery) {
    const key = cacheKeys.teamList(hashQuery(q as Record<string, unknown>));
    return cached(key, CACHE_TTL.teamList * 1000, () => jsonTeamRepository.list(q));
  },
  async byId(id: string) {
    return cached(cacheKeys.teamItem(id), CACHE_TTL.teamItem * 1000, async () => {
      const item = await jsonTeamRepository.byId(id);
      if (!item) throw AppError.notFound("Team member not found");
      return item;
    });
  },
};

/* ---------------- Gallery ---------------- */

export const galleryService = {
  async list(q: GalleryQuery) {
    const key = cacheKeys.galleryList(hashQuery(q as Record<string, unknown>));
    return cached(key, CACHE_TTL.galleryList * 1000, () => jsonGalleryRepository.list(q));
  },
  async byId(id: string) {
    return cached(cacheKeys.galleryItem(id), CACHE_TTL.galleryItem * 1000, async () => {
      const item = await jsonGalleryRepository.byId(id);
      if (!item) throw AppError.notFound("Gallery item not found");
      return item;
    });
  },
};

/* ---------------- Static content ---------------- */

export const contentService = {
  siteConfig: () => cached(cacheKeys.siteConfig(), CACHE_TTL.siteConfig * 1000, () => jsonContentRepository.siteConfig()),
  stats: () => cached(cacheKeys.stats(), CACHE_TTL.stats * 1000, () => jsonContentRepository.stats()),
  features: () => cached(cacheKeys.features(), CACHE_TTL.features * 1000, () => jsonContentRepository.features()),
  facilities: () => cached(cacheKeys.facilities(), CACHE_TTL.facilities * 1000, () => jsonContentRepository.facilities()),
  faqs: () => cached(cacheKeys.faqs(), CACHE_TTL.faqs * 1000, () => jsonContentRepository.faqs()),
  quickLinks: () => cached(cacheKeys.quickLinks(), CACHE_TTL.quickLinks * 1000, () => jsonContentRepository.quickLinks()),
  contactInfo: () => cached(cacheKeys.contactInfo(), CACHE_TTL.contactInfo * 1000, () => jsonContentRepository.contactInfo()),
};

/* ---------------- Invalidation (Phase 3 admin entry points) ---------------- */

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
};
