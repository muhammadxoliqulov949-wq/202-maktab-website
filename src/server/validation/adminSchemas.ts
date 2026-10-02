import { z } from "zod";

/**
 * Admin API validation — server-side authority (client validation is UX only).
 * All schemas produce safe, bounded values; error details go through
 * zodDetails() without leaking internals.
 */

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z.string().regex(slugRegex, "slug: lowercase letters, numbers and dashes only").max(120);

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "invalid ISO date")
  .optional()
  .nullable();

const shortText = (min: number, max: number) => z.string().trim().min(min).max(max);
const optText = (max: number) => z.string().trim().max(max).optional().nullable();

/* ---------------- news ---------------- */

export const newsBlockSchema = z.object({
  type: z.enum(["p", "h", "quote"]),
  text: z.string().max(5000).optional(),
});

export const newsCreateSchema = z.object({
  title: shortText(3, 200),
  slug: slugSchema.optional(),
  excerpt: z.string().trim().max(600).default(""),
  category: z.string().trim().min(1).max(60).default("Yangiliklar"),
  author: optText(120),
  readingTime: optText(40),
  coverImage: optText(600),
  coverAlt: optText(300),
  content: z.array(newsBlockSchema).max(300).default([]),
  isPublished: z.boolean().default(false),
  publishedAt: isoDate,
});
export const newsUpdateSchema = newsCreateSchema.partial();

export type NewsCreateInput = z.infer<typeof newsCreateSchema>;
export type NewsUpdateInput = z.infer<typeof newsUpdateSchema>;

/* ---------------- team ---------------- */

export const teamCreateSchema = z.object({
  name: shortText(2, 120),
  role: shortText(2, 120),
  subject: optText(120),
  group: z.enum(["leadership", "teachers", "administration"]).default("teachers"),
  category: z.string().trim().min(1).max(60).default("Rahbariyat"),
  experience: optText(120),
  photo: optText(600),
  alt: optText(300),
  bio: optText(2000),
  email: z.union([z.literal(""), z.string().email()]).optional().nullable(),
  phone: optText(40),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const teamUpdateSchema = teamCreateSchema.partial();

/* ---------------- gallery ---------------- */

export const galleryCreateSchema = z.object({
  type: z.enum(["image", "video"]),
  src: shortText(1, 600),
  poster: optText(600),
  alt: optText(300),
  caption: optText(300),
  album: optText(120),
  category: z.string().trim().min(1).max(60).default("Maktab muhiti"),
  externalUrl: optText(600),
  width: z.coerce.number().int().min(0).max(20000).default(0),
  height: z.coerce.number().int().min(0).max(20000).default(0),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const galleryUpdateSchema = galleryCreateSchema.partial();

/* ---------------- faqs ---------------- */

export const faqCreateSchema = z.object({
  q: shortText(3, 500),
  a: shortText(1, 4000),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const faqUpdateSchema = faqCreateSchema.partial();

/* ---------------- facilities ---------------- */

export const facilityCreateSchema = z.object({
  kicker: optText(120),
  title: shortText(2, 150),
  description: z.string().trim().max(1000).default(""),
  image: shortText(1, 600),
  alt: optText(300),
  videoUrl: optText(600),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const facilityUpdateSchema = facilityCreateSchema.partial();

/* ---------------- features ---------------- */

export const featureCreateSchema = z.object({
  index: optText(10),
  title: shortText(2, 150),
  description: z.string().trim().max(1000).default(""),
  icon: z.string().trim().max(60).default("book"),
  image: optText(600),
  alt: optText(300),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const featureUpdateSchema = featureCreateSchema.partial();

/* ---------------- statistics ---------------- */

export const statCreateSchema = z.object({
  id: slugSchema.optional(),
  value: z.coerce.number().int().min(0).max(1_000_000),
  suffix: z.string().trim().max(10).default(""),
  label: shortText(1, 80),
  description: z.string().trim().max(300).default(""),
  icon: z.string().trim().max(60).default("info"),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const statUpdateSchema = statCreateSchema.partial();

/* ---------------- quick links ---------------- */

export const quickLinkCreateSchema = z.object({
  title: shortText(1, 120),
  description: z.string().trim().max(300).default(""),
  icon: z.string().trim().max(60).default("link"),
  href: shortText(1, 600),
  openInNewTab: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const quickLinkUpdateSchema = quickLinkCreateSchema.partial();

/* ---------------- settings & contact info ---------------- */

const contactValue = z.object({ display: z.string().trim().max(60), href: z.string().trim().max(300) });

export const settingsPatchSchema = z
  .object({
    name: shortText(1, 120),
    fullName: shortText(1, 250),
    tagline: z.string().trim().max(250),
    district: z.string().trim().max(250),
    address: z.string().trim().max(400),
    established: z.string().trim().max(40),
    locale: z.string().trim().max(10),
    logoUrl: optText(600),
    faviconUrl: optText(600),
    social: z.object({ telegram: z.string().trim().max(300).optional(), instagram: z.string().trim().max(300).optional() }),
  })
  .partial();

export const contactInfoPatchSchema = z
  .object({
    address: z.string().trim().max(400),
    phone: contactValue,
    mobile: contactValue,
    email: contactValue,
    hours: z.array(z.object({ days: z.string().trim().max(80), time: z.string().trim().max(80) })).max(10),
    map: z.object({
      embed: z.string().trim().max(1000),
      route: z.string().trim().max(600),
      view: z.string().trim().max(600),
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      verified: z.boolean(),
    }),
    social: z.object({ telegram: z.string().trim().max(300).optional(), instagram: z.string().trim().max(300).optional() }),
  })
  .partial();

/* ---------------- submissions ---------------- */

export const submissionStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "spam"]),
});

/* ---------------- reorder ---------------- */

export const reorderSchema = z.object({
  ids: z.array(z.string().min(1).max(120)).min(1).max(500),
});

/* ---------------- list queries (shared) ---------------- */

export const adminListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["all", "published", "draft", "archived"]).default("all"),
  category: z.string().trim().max(60).optional(),
});

export const adminCollectionQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  search: z.string().trim().max(120).optional(),
  status: z.enum(["all", "visible", "hidden"]).default("all"),
});

export const adminSubmissionsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(["new", "in_progress", "resolved", "spam"]).optional(),
});

export const auditListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  action: z.string().trim().max(40).optional(),
  entityType: z.string().trim().max(60).optional(),
});

/** Slug generator — Uzbek-friendly: oʻ/gʻ collapse to o/g, ASCII-safe. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ʻʼ‘’'"'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}
