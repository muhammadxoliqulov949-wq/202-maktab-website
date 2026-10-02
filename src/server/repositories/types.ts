/**
 * Canonical content rows — the language spoken between repositories and
 * services. Both providers (json = in-memory store, supabase = PostgreSQL)
 * produce exactly these shapes; mappers.ts derives the public API DTOs.
 */

export type ContentBlock = { type: "p" | "h" | "quote"; text?: string };

export type NewsRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // ISO date shown publicly
  readingTime: string;
  image: string;
  alt: string;
  body: ContentBlock[];
  author: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamRow = {
  id: string;
  name: string;
  role: string;
  subject: string | null;
  group: "leadership" | "teachers" | "administration";
  category: string;
  experience: string;
  photo: string;
  alt: string;
  bio: string | null;
  email: string | null;
  phone: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GalleryRow = {
  id: string;
  type: "image" | "video";
  src: string;
  poster: string | null;
  alt: string;
  category: string;
  album: string;
  width: number;
  height: number;
  caption: string | null;
  externalUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaqRow = {
  id: string;
  q: string;
  a: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StatRow = {
  id: string;
  value: number;
  suffix: string;
  label: string;
  description: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
};

export type FeatureRow = {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: string;
  image: string | null;
  alt: string | null;
  sortOrder: number;
  isVisible: boolean;
};

export type FacilityRow = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  videoUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
};

export type QuickLinkRow = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  openInNewTab: boolean;
  sortOrder: number;
  isVisible: boolean;
};

export type SiteSettingsRow = {
  name: string;
  fullName: string;
  tagline: string;
  district: string;
  address: string;
  established: string;
  locale: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  social: { telegram?: string; instagram?: string };
};

export type ContactInfoRow = {
  address: string;
  phone: { display: string; href: string };
  mobile: { display: string; href: string };
  email: { display: string; href: string };
  hours: Array<{ days: string; time: string }>;
  map: {
    embed: string;
    route: string;
    view: string;
    latitude: number;
    longitude: number;
    verified: boolean;
  };
  social: { telegram?: string; instagram?: string };
};

export type SubmissionStatus = "new" | "in_progress" | "resolved" | "spam";

export type SubmissionRow = {
  id: string;
  name: string;
  contact: string;
  topic: string;
  message: string;
  status: SubmissionStatus;
  source: string;
  createdAt: string;
  handledAt: string | null;
};

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ARCHIVE"
  | "RESTORE"
  | "PUBLISH"
  | "UNPUBLISH"
  | "STATUS_CHANGE"
  | "REORDER";

export type AuditRow = {
  id: string;
  adminIdentifier: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/** ---------------- Public API DTOs (frozen Phase 2 contracts) ---------------- */

export type NewsListItemDto = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  dateLabel: string;
  readingTime: string;
  image: string;
  alt: string;
};

export type NewsArticleDto = NewsListItemDto & { body: ContentBlock[] };

export type TeamListItemDto = {
  id: string;
  name: string;
  role: string;
  subject: string | null;
  group: string;
  category: string;
  experience: string;
  photo: string | null;
  hasPhoto: boolean;
};

export type TeamItemDto = {
  id: string;
  name: string;
  role: string;
  subject: string | null;
  group: string;
  category: string;
  experience: string;
  photo: string;
  alt: string;
};

export type GalleryItemDto = {
  id: string;
  type: "image" | "video";
  src: string;
  poster: string | null;
  alt: string;
  category: string;
  album: string;
  width: number;
  height: number;
};
