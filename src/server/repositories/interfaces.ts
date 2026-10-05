import type { Paginated } from "@/server/types/api";
import type {
  AdminUserRow,
  AuditRow,
  ContactInfoRow,
  FaqRow,
  FacilityRow,
  FeatureRow,
  GalleryItemDto,
  GalleryRow,
  NewsArticleDto,
  NewsListItemDto,
  NewsRow,
  QuickLinkRow,
  SiteSettingsRow,
  StatRow,
  SubmissionRow,
  SubmissionStatus,
  TeamItemDto,
  TeamListItemDto,
  TeamRow,
} from "@/server/repositories/types";

/**
 * Repository interfaces — the stable seam between services and storage.
 * Phase 2 shipped in-memory (JSON/TS) implementations; Phase 3 adds
 * Supabase PostgreSQL implementations of the SAME interfaces, so services
 * and controllers do not change when the provider switches.
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

/** Public news repo — published, non-archived articles ONLY. */
export interface NewsRepository {
  list(query: NewsQuery): Promise<Paginated<NewsListItemDto>>;
  bySlug(slug: string): Promise<NewsArticleDto | null>;
  slugs(): Promise<string[]>;
}

export interface TeamRepository {
  list(query: TeamQuery): Promise<Paginated<TeamListItemDto>>;
  byId(id: string): Promise<TeamItemDto | null>;
}

export interface GalleryRepository {
  list(query: GalleryQuery): Promise<Paginated<GalleryItemDto>>;
  byId(id: string): Promise<GalleryItemDto | null>;
}

/** site-config / stats / features / facilities / faqs / quick-links / contact-info */
export interface ContentRepository {
  siteConfig(): Promise<Record<string, unknown>>;
  stats(): Promise<{ items: Array<{ id: string; value: number; suffix: string; label: string; description: string; icon: string }>; count: number }>;
  features(): Promise<{ items: unknown[]; count: number }>;
  facilities(): Promise<{ items: unknown[]; count: number }>;
  faqs(): Promise<{ items: Array<{ q: string; a: string }>; count: number }>;
  quickLinks(): Promise<{ items: unknown[]; count: number }>;
  contactInfo(): Promise<Record<string, unknown>>;
}

export type { StatRow, FeatureRow, FacilityRow, FaqRow, QuickLinkRow, SiteSettingsRow, ContactInfoRow };

/**
 * Contact submissions — Phase 3 now persists them (admin inbox).
 * Public API NEVER exposes these records.
 */
export interface ContactSubmissionRepository {
  save(submission: SubmissionRow): Promise<SubmissionRow>;
  list(query: { status?: SubmissionStatus; page: number; limit: number }): Promise<Paginated<SubmissionRow>>;
  byId(id: string): Promise<SubmissionRow | null>;
  updateStatus(id: string, status: SubmissionStatus): Promise<SubmissionRow | null>;
  remove(id: string): Promise<boolean>;
  counts(): Promise<{ new: number; in_progress: number; resolved: number; spam: number; total: number }>;
}

/** Admin audit trail — append-only from the admin service. */
export interface AuditRepository {
  append(entry: Omit<AuditRow, "id" | "createdAt">): Promise<AuditRow>;
  list(query: { page: number; limit: number; action?: string; entityType?: string }): Promise<Paginated<AuditRow>>;
  recent(n: number): Promise<AuditRow[]>;
}

/** Full row access for the admin CMS (drafts, archives, reorder, CRUD). */
export type AdminStatusFilter = "all" | "published" | "draft" | "archived";

export interface AdminNewsRepository {
  list(query: { search?: string; category?: string; status: AdminStatusFilter; page: number; limit: number }): Promise<Paginated<NewsRow>>;
  byId(id: string): Promise<NewsRow | null>;
  bySlug(slug: string): Promise<NewsRow | null>;
  slugExists(slug: string, excludeId?: string): Promise<boolean>;
  create(row: NewsRow): Promise<NewsRow>;
  update(id: string, patch: Partial<NewsRow>): Promise<NewsRow | null>;
  setStatus(id: string, patch: { isPublished?: boolean; publishedAt?: string | null; archivedAt?: string | null }): Promise<NewsRow | null>;
  remove(id: string): Promise<boolean>;
  categories(): Promise<string[]>;
}

/** Reorderable admin collections. */
export interface AdminReorderableRepository<T> {
  list(query: { search?: string; status?: "all" | "visible" | "hidden"; page: number; limit: number }): Promise<Paginated<T>>;
  byId(id: string): Promise<T | null>;
  create(row: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
  reorder(orderedIds: string[]): Promise<boolean>;
}

export type AdminTeamRepository = AdminReorderableRepository<TeamRow>;
export type AdminGalleryRepository = AdminReorderableRepository<GalleryRow>;
export type AdminFaqRepository = AdminReorderableRepository<FaqRow>;
export type AdminFacilityRepository = AdminReorderableRepository<FacilityRow>;
export type AdminFeatureRepository = AdminReorderableRepository<FeatureRow>;
export type AdminStatRepository = AdminReorderableRepository<StatRow>;
export type AdminQuickLinkRepository = AdminReorderableRepository<QuickLinkRow>;

export interface AdminSettingsRepository {
  get(): Promise<SiteSettingsRow>;
  update(patch: Partial<SiteSettingsRow>): Promise<SiteSettingsRow>;
  getContactInfo(): Promise<ContactInfoRow>;
  updateContactInfo(patch: Partial<ContactInfoRow>): Promise<ContactInfoRow>;
}

/**
 * Phase 4 — administrator directory.
 * Backed by the `admin_users` table (Supabase) or the in-memory store (dev).
 * Credentials are NEVER stored here; verification is delegated to Supabase Auth.
 */
export interface AdminUserRepository {
  byUserId(userId: string): Promise<AdminUserRow | null>;
  list(query: { page: number; limit: number }): Promise<Paginated<AdminUserRow>>;
  create(row: { userId: string; email: string; role: string; isActive: boolean }): Promise<AdminUserRow>;
  setActive(id: string, isActive: boolean): Promise<AdminUserRow | null>;
  setRole(id: string, role: string): Promise<AdminUserRow | null>;
  touchLogin(userId: string): Promise<void>;
  remove(id: string): Promise<boolean>;
  /** Roles available in the catalogue (admin_roles). */
  roles(): Promise<Array<{ role: string; description: string | null; permissions: string[] }>>;
}

/** Aggregated provider set returned by the factory (see ./index.ts). */
export type DataProviders = {
  news: NewsRepository;
  team: TeamRepository;
  gallery: GalleryRepository;
  content: ContentRepository;
  submissions: ContactSubmissionRepository;
  audit: AuditRepository;
  adminUsers: AdminUserRepository;
  adminNews: AdminNewsRepository;
  adminTeam: AdminTeamRepository;
  adminGallery: AdminGalleryRepository;
  adminFaqs: AdminFaqRepository;
  adminFacilities: AdminFacilityRepository;
  adminFeatures: AdminFeatureRepository;
  adminStats: AdminStatRepository;
  adminQuickLinks: AdminQuickLinkRepository;
  adminSettings: AdminSettingsRepository;
};
