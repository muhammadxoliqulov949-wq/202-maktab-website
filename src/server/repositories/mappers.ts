import { formatDate } from "@/data/news";
import type {
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
  TeamItemDto,
  TeamListItemDto,
  TeamRow,
} from "@/server/repositories/types";

/**
 * Row → public API DTO mappers.
 * These reproduce the frozen Phase 2 response contracts EXACTLY, so the
 * public API is byte-compatible whether DATA_PROVIDER=json or supabase.
 */

export function toNewsListItem(r: NewsRow): NewsListItemDto {
  return {
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    category: r.category,
    date: r.date,
    dateLabel: formatDate(r.date),
    readingTime: r.readingTime,
    image: r.image,
    alt: r.alt,
  };
}

export function toNewsArticle(r: NewsRow): NewsArticleDto {
  return { ...toNewsListItem(r), body: r.body };
}

export function toTeamListItem(r: TeamRow): TeamListItemDto {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    subject: r.subject,
    group: r.group,
    category: r.category,
    experience: r.experience,
    photo: r.photo || null,
    hasPhoto: Boolean(r.photo),
  };
}

export function toTeamItem(r: TeamRow): TeamItemDto {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    subject: r.subject,
    group: r.group,
    category: r.category,
    experience: r.experience,
    photo: r.photo,
    alt: r.alt,
  };
}

export function toGalleryItem(r: GalleryRow): GalleryItemDto {
  return {
    id: r.id,
    type: r.type,
    src: r.src,
    poster: r.poster,
    alt: r.alt,
    category: r.category,
    album: r.album,
    width: r.width,
    height: r.height,
  };
}

export function toFaqItem(r: FaqRow): { q: string; a: string } {
  return { q: r.q, a: r.a };
}

export function toStatItem(r: StatRow): { id: string; value: number; suffix: string; label: string; description: string; icon: string } {
  return { id: r.id, value: r.value, suffix: r.suffix, label: r.label, description: r.description, icon: r.icon };
}

export function toFeatureItem(r: FeatureRow): { id: string; index: string; title: string; description: string; icon: string; image?: string; alt?: string } {
  return {
    id: r.id,
    index: r.index,
    title: r.title,
    description: r.description,
    icon: r.icon,
    ...(r.image ? { image: r.image } : {}),
    ...(r.alt ? { alt: r.alt } : {}),
  };
}

export function toFacilityItem(r: FacilityRow): { id: string; kicker: string; title: string; description: string; image: string; alt: string } {
  return { id: r.id, kicker: r.kicker, title: r.title, description: r.description, image: r.image, alt: r.alt };
}

export function toQuickLinkItem(r: QuickLinkRow): { id: string; title: string; description: string; icon: string; href: string } {
  return { id: r.id, title: r.title, description: r.description, icon: r.icon, href: r.href };
}

export function toSiteConfigDto(s: SiteSettingsRow): Record<string, unknown> {
  return {
    name: s.name,
    fullName: s.fullName,
    tagline: s.tagline,
    district: s.district,
    address: s.address,
    established: s.established,
    locale: s.locale || "uz",
    social: s.social,
  };
}

export function toContactInfoDto(c: ContactInfoRow): Record<string, unknown> {
  return {
    address: c.address,
    phone: c.phone,
    mobile: c.mobile,
    email: c.email,
    hours: c.hours,
    map: c.map,
    social: c.social,
  };
}
