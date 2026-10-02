import { z } from "zod";

/** Shared query primitives — reject bad input before business logic. */
const pageSchema = z.coerce.number().int().min(1).max(10_000).default(1);
const limitSchema = (max: number, def: number) =>
  z.coerce.number().int().min(1).max(max).default(def);
const searchSchema = z
  .string()
  .trim()
  .max(100, "Search query must be at most 100 characters")
  .transform((s) => s.replace(/[%_\\]/g, " ").replace(/\s+/g, " "))
  .optional();

export const newsListQuery = z.object({
  category: z.enum(["Yangiliklar", "Tadbirlar", "Sport", "Tanlovlar", "Ochiq darslar"]).optional(),
  search: searchSchema,
  page: pageSchema,
  limit: limitSchema(50, 12),
  sort: z.enum(["date-desc", "date-asc", "title"]).default("date-desc"),
});

export const teamListQuery = z.object({
  role: z.enum(["leadership", "teachers", "administration"]).optional(),
  subject: z.string().trim().max(60).optional(),
  search: searchSchema,
  page: pageSchema,
  limit: limitSchema(50, 12),
});

export const galleryListQuery = z.object({
  type: z.enum(["image", "video"]).optional(),
  category: z.string().trim().max(40).optional(),
  page: pageSchema,
  limit: limitSchema(50, 12),
});

export const idParam = z.string().trim().min(1).max(80);

/** POST /api/v1/contact body. `website` is a honeypot — must stay empty. */
export const contactBody = z.object({
  name: z.string().trim().min(2, "Ismingizni kiriting").max(80),
  contact: z
    .string()
    .trim()
    .min(5, "Telefon yoki email kiriting")
    .max(120)
    .refine(
      (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || // email
        /^\+?[0-9\s\-()]{7,20}$/.test(v), // phone
      "To‘g‘ri telefon raqam yoki email kiriting"
    ),
  topic: z.enum(["admission", "school", "documents", "cooperation", "other"]).default("admission"),
  message: z.string().trim().min(10, "Xabar kamida 10 belgidan iborat bo‘lsin").max(2000),
  // honeypot: accepted but must be empty — filled value is silently marked as spam (never a 422)
  website: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactBody>;
