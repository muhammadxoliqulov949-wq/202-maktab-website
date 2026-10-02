import { NEWS, NEWS_CATEGORIES } from "@/data/news";
import { PEOPLE } from "@/data/people";
import { GALLERY, GALLERY_CATEGORIES } from "@/data/gallery";
import { FAQS } from "@/data/faq";
import { STATS } from "@/data/stats";
import { EDU_FEATURES } from "@/data/education";
import { FACILITIES } from "@/data/facilities";
import { QUICK_LINKS } from "@/data/quicklinks";
import { site } from "@/data/site";
import type {
  AuditRow,
  ContactInfoRow,
  FaqRow,
  FacilityRow,
  FeatureRow,
  GalleryRow,
  NewsRow,
  QuickLinkRow,
  SiteSettingsRow,
  StatRow,
  SubmissionRow,
  TeamRow,
} from "@/server/repositories/types";

/**
 * In-memory data store — the backing implementation of the `json` provider.
 * Seeded ONCE per process from the Phase 1 content modules (src/data/*),
 * which remain the single source of truth for prototype content.
 *
 * Admin mutations (DATA_PROVIDER=json) write here: they are real CRUD against
 * a real store, but the store is per-process memory — changes reset on
 * restart. That is the documented dev-mode trade-off; DATA_PROVIDER=supabase
 * persists to PostgreSQL through the same repository interfaces.
 */
export type Store = {
  news: NewsRow[];
  team: TeamRow[];
  gallery: GalleryRow[];
  faqs: FaqRow[];
  stats: StatRow[];
  features: FeatureRow[];
  facilities: FacilityRow[];
  quickLinks: QuickLinkRow[];
  newsCategories: string[];
  galleryCategories: string[];
  settings: SiteSettingsRow;
  contactInfo: ContactInfoRow;
  submissions: SubmissionRow[];
  audit: AuditRow[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function createStore(): Store {
  const t = nowIso();
  return {
    news: NEWS.map((n) => ({
      id: n.slug,
      slug: n.slug,
      title: n.title,
      excerpt: n.excerpt,
      category: n.category,
      date: n.date,
      readingTime: n.readingTime,
      image: n.image,
      alt: n.alt,
      body: n.body.map((b) => ({ ...b })),
      author: null,
      isPublished: true,
      publishedAt: new Date(`${n.date}T06:00:00Z`).toISOString(),
      archivedAt: null,
      createdAt: t,
      updatedAt: t,
    })),
    team: PEOPLE.map((p, i) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      subject: p.subject ?? null,
      group: p.group,
      category: p.category,
      experience: p.experience,
      photo: p.photo,
      alt: p.alt,
      bio: null,
      email: null,
      phone: null,
      sortOrder: i,
      isVisible: true,
      createdAt: t,
      updatedAt: t,
    })),
    gallery: GALLERY.map((g, i) => ({
      id: g.id,
      type: g.type,
      src: g.src,
      poster: g.poster ?? null,
      alt: g.alt,
      category: g.category,
      album: g.album,
      width: g.width,
      height: g.height,
      caption: null,
      externalUrl: null,
      sortOrder: i,
      isVisible: true,
      createdAt: t,
      updatedAt: t,
    })),
    faqs: FAQS.map((f, i) => ({ id: `faq-${String(i + 1).padStart(2, "0")}`, q: f.q, a: f.a, sortOrder: i, isVisible: true, createdAt: t, updatedAt: t })),
    stats: STATS.map((s, i) => ({ id: s.id, value: s.value, suffix: s.suffix, label: s.label, description: s.description, icon: s.icon, sortOrder: i, isVisible: true })),
    features: EDU_FEATURES.map((f, i) => ({
      id: f.id,
      index: f.index,
      title: f.title,
      description: f.description,
      icon: f.icon,
      image: f.image ?? null,
      alt: f.alt ?? null,
      sortOrder: i,
      isVisible: true,
    })),
    facilities: FACILITIES.map((f, i) => ({
      id: f.id,
      kicker: f.kicker,
      title: f.title,
      description: f.description,
      image: f.image,
      alt: f.alt,
      videoUrl: null,
      sortOrder: i,
      isVisible: true,
    })),
    quickLinks: QUICK_LINKS.map((q, i) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      icon: q.icon,
      href: q.href,
      openInNewTab: false,
      sortOrder: i,
      isVisible: true,
    })),
    newsCategories: [...NEWS_CATEGORIES],
    galleryCategories: [...GALLERY_CATEGORIES],
    settings: {
      name: site.name,
      fullName: site.fullName,
      tagline: site.tagline,
      district: site.district,
      address: site.address,
      established: site.established,
      locale: "uz",
      logoUrl: null,
      faviconUrl: null,
      social: { ...site.social },
    },
    contactInfo: {
      address: site.address,
      phone: { ...site.phone },
      mobile: { ...site.mobile },
      email: { ...site.email },
      hours: site.hours.map((h) => ({ ...h })),
      map: {
        embed: site.map.embed,
        route: site.map.route,
        view: site.map.view,
        latitude: 41.2797,
        longitude: 69.2404,
        verified: false, // Phase 5 replaces with verified coordinates
      },
      social: { ...site.social },
    },
    submissions: [],
    audit: [],
  };
}

const g = globalThis as unknown as { __m202Store?: Store };

/** Process-wide store singleton (survives route-module reloads in dev). */
export function getStore(): Store {
  if (!g.__m202Store) g.__m202Store = createStore();
  return g.__m202Store;
}

/** Test helper: reset the store to pristine seed state. */
export function resetStore(): void {
  g.__m202Store = createStore();
}

export function touch(existing?: string): string {
  return existing ?? nowIso();
}
