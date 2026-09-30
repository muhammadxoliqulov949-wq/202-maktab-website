import type { Paginated } from "@/server/types/api";

/**
 * Repository interfaces — Phase 2 implementations are in-memory (JSON/TS data).
 * Phase 3 adds database implementations of the SAME interfaces; controllers
 * and services must not change when that happens.
 */

export type NewsQuery = {
  category?: string;
  search?: string;
  page: number;
  limit: number;
  sort: "date-desc" | "date-asc" | "title";
};

export type TeamQuery = {
  role?: string;
  subject?: string;
  search?: string;
  page: number;
  limit: number;
};

export type GalleryQuery = {
  type?: string;
  category?: string;
  page: number;
  limit: number;
};

export interface NewsRepository {
  list(query: NewsQuery): Promise<Paginated<unknown>>;
  bySlug(slug: string): Promise<unknown | null>;
  slugs(): Promise<string[]>;
}

export interface TeamRepository {
  list(query: TeamQuery): Promise<Paginated<unknown>>;
  byId(id: string): Promise<unknown | null>;
}

export interface GalleryRepository {
  list(query: GalleryQuery): Promise<Paginated<unknown>>;
  byId(id: string): Promise<unknown | null>;
}

/** site-config / stats / features / facilities / faqs / quick-links / contact-info */
export interface ContentRepository {
  siteConfig(): Promise<unknown>;
  stats(): Promise<unknown>;
  features(): Promise<unknown>;
  facilities(): Promise<unknown>;
  faqs(): Promise<unknown>;
  quickLinks(): Promise<unknown>;
  contactInfo(): Promise<unknown>;
}

/** Phase 3+ persistence target for contact submissions (no storage in Phase 2). */
export interface ContactSubmissionRepository {
  save(submission: unknown): Promise<{ id: string }>;
}
