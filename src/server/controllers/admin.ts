import type { NextRequest } from "next/server";
import type { HandlerResult } from "@/server/types/api";
import { AppError, zodDetails } from "@/server/errors/AppError";
import { adminService, requireAdmin, type CollectionName } from "@/server/services/admin.service";
import { slugify } from "@/server/validation/adminSchemas";
import { supabaseAdmin } from "@/server/repositories/supabase/client";
import { dbGuard } from "@/server/repositories/supabase/db";
import { getEnv } from "@/server/config/env";
import { z } from "zod";
import {
  adminCollectionQuery,
  adminListQuery,
  adminSubmissionsQuery,
  auditListQuery,
  contactInfoPatchSchema,
  faqCreateSchema,
  faqUpdateSchema,
  facilityCreateSchema,
  facilityUpdateSchema,
  featureCreateSchema,
  featureUpdateSchema,
  galleryCreateSchema,
  galleryUpdateSchema,
  newsCreateSchema,
  newsUpdateSchema,
  quickLinkCreateSchema,
  quickLinkUpdateSchema,
  reorderSchema,
  settingsPatchSchema,
  statCreateSchema,
  statUpdateSchema,
  submissionStatusSchema,
  teamCreateSchema,
  teamUpdateSchema,
} from "@/server/validation/adminSchemas";

/**
 * Admin controllers — framework-thin: gate → parse → validate → service.
 * No caching on admin reads (always fresh), envelope identical to public API.
 */

function searchParams(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

function ok(data: unknown, meta?: Record<string, unknown>): HandlerResult {
  return { status: 200, body: { success: true, data, meta: meta ?? {} } };
}

function created(data: unknown): HandlerResult {
  return { status: 201, body: { success: true, data, meta: {} } };
}

function parseOr422<S extends z.ZodTypeAny>(schema: S, payload: unknown): z.infer<S> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw AppError.validation(zodDetails(parsed.error.issues));
  return parsed.data;
}

function assertId(id: string | undefined, key = "id"): string {
  const v = (id ?? "").trim();
  if (!v || v.length > 120) throw AppError.badRequest(`Invalid ${key}`);
  return v;
}

const COLLECTIONS: CollectionName[] = ["team", "gallery", "faqs", "facilities", "features", "statistics", "quick-links"];

function collectionName(raw: string): CollectionName {
  if (!(COLLECTIONS as string[]).includes(raw)) throw AppError.notFound("Unknown collection");
  return raw as CollectionName;
}

/* ---------------- gate + dashboard ---------------- */

export async function adminDashboard(req: NextRequest) {
  requireAdmin(req);
  return ok(await adminService.dashboard());
}

/* ---------------- news ---------------- */

export async function adminNewsList(req: NextRequest) {
  requireAdmin(req);
  const q = parseOr422(adminListQuery, searchParams(req));
  const [page, categories] = await Promise.all([adminService.newsList(q), adminService.newsCategories()]);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages, categories });
}

export async function adminNewsGet(req: NextRequest, id?: string) {
  requireAdmin(req);
  return ok(await adminService.newsGet(assertId(id)));
}

export async function adminNewsCreate(req: NextRequest) {
  const ident = requireAdmin(req);
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const input = parseOr422(newsCreateSchema, body);
  return created(await adminService.newsCreate(input, ident));
}

export async function adminNewsUpdate(req: NextRequest, id?: string) {
  const ident = requireAdmin(req);
  const pid = assertId(id);
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const patch = parseOr422(newsUpdateSchema, body);
  return ok(await adminService.newsUpdate(pid, patch, ident));
}

export async function adminNewsDelete(req: NextRequest, id?: string) {
  const ident = requireAdmin(req);
  const hard = req.nextUrl.searchParams.get("hard") === "true";
  return ok(await adminService.newsDelete(assertId(id), hard, ident));
}

/* ---------------- collections (generic) ---------------- */

type CollectionSchemas = { create: z.ZodType; update: z.ZodType };

const SCHEMAS: Record<CollectionName, CollectionSchemas> = {
  team: { create: teamCreateSchema, update: teamUpdateSchema },
  gallery: { create: galleryCreateSchema, update: galleryUpdateSchema },
  faqs: { create: faqCreateSchema, update: faqUpdateSchema },
  facilities: { create: facilityCreateSchema, update: facilityUpdateSchema },
  features: { create: featureCreateSchema, update: featureUpdateSchema },
  statistics: { create: statCreateSchema, update: statUpdateSchema },
  "quick-links": { create: quickLinkCreateSchema, update: quickLinkUpdateSchema },
};

/** Build a storage row from validated create input (id candidate included). */
function rowFromCreate(entity: CollectionName, input: Record<string, unknown>): Record<string, unknown> {
  const now = new Date().toISOString();
  const base: Record<string, unknown> = { ...input, createdAt: now, updatedAt: now };
  switch (entity) {
    case "team":
      base.id = slugify(String(input.name ?? "")) || undefined;
      base.sortOrder = input.sortOrder ?? undefined;
      break;
    case "gallery":
      base.id = `${input.type === "video" ? "v" : "g"}-${Date.now().toString(36)}`;
      break;
    case "faqs":
      base.id = `faq-${Date.now().toString(36)}`;
      break;
    case "facilities":
    case "features":
    case "quick-links":
      base.id = slugify(String(input.title ?? "")) || undefined;
      break;
    case "statistics":
      base.id = input.id ?? (slugify(String(input.label ?? "")) || undefined);
      break;
  }
  return base;
}

export async function adminCollectionList(req: NextRequest, entity: string) {
  requireAdmin(req);
  const name = collectionName(entity);
  const q = parseOr422(adminCollectionQuery, searchParams(req));
  const page = await adminService.collectionList(name, q);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages });
}

export async function adminCollectionGet(req: NextRequest, entity: string, id?: string) {
  requireAdmin(req);
  return ok(await adminService.collectionGet(collectionName(entity), assertId(id)));
}

export async function adminCollectionCreate(req: NextRequest, entity: string) {
  const ident = requireAdmin(req);
  const name = collectionName(entity);
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const input = parseOr422(SCHEMAS[name].create, body) as Record<string, unknown>;
  return created(await adminService.collectionCreate(name, rowFromCreate(name, input), ident));
}

export async function adminCollectionUpdate(req: NextRequest, entity: string, id?: string) {
  const ident = requireAdmin(req);
  const name = collectionName(entity);
  const pid = assertId(id);
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const patch = parseOr422(SCHEMAS[name].update, body) as Record<string, unknown>;
  delete patch.createdAt;
  delete patch.updatedAt;
  return ok(await adminService.collectionUpdate(name, pid, patch, ident));
}

export async function adminCollectionDelete(req: NextRequest, entity: string, id?: string) {
  const ident = requireAdmin(req);
  return ok(await adminService.collectionDelete(collectionName(entity), assertId(id), ident));
}

export async function adminCollectionReorder(req: NextRequest, entity: string) {
  const ident = requireAdmin(req);
  const body = await req.json().catch(() => null);
  const parsed = parseOr422(reorderSchema, body);
  return ok(await adminService.collectionReorder(collectionName(entity), parsed.ids, ident));
}

/* ---------------- settings ---------------- */

export async function adminSettingsGet(req: NextRequest) {
  requireAdmin(req);
  return ok(await adminService.settingsGet());
}

export async function adminSettingsPatch(req: NextRequest) {
  const ident = requireAdmin(req);
  const body = await req.json().catch(() => null);
  const patch = parseOr422(settingsPatchSchema, body);
  return ok(await adminService.settingsPatch(patch, ident));
}

export async function adminContactInfoGet(req: NextRequest) {
  requireAdmin(req);
  return ok(await adminService.contactInfoGet());
}

export async function adminContactInfoPatch(req: NextRequest) {
  const ident = requireAdmin(req);
  const body = await req.json().catch(() => null);
  const patch = parseOr422(contactInfoPatchSchema, body);
  return ok(await adminService.contactInfoPatch(patch, ident));
}

/* ---------------- submissions ---------------- */

export async function adminSubmissionsList(req: NextRequest) {
  requireAdmin(req);
  const q = parseOr422(adminSubmissionsQuery, searchParams(req));
  const page = await adminService.submissionsList(q);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages });
}

export async function adminSubmissionStatus(req: NextRequest, id?: string) {
  const ident = requireAdmin(req);
  const pid = assertId(id);
  const body = await req.json().catch(() => null);
  const { status } = parseOr422(submissionStatusSchema, body);
  return ok(await adminService.submissionStatus(pid, status, ident));
}

export async function adminSubmissionDelete(req: NextRequest, id?: string) {
  const ident = requireAdmin(req);
  return ok(await adminService.submissionDelete(assertId(id), ident));
}

/* ---------------- audit ---------------- */

export async function adminAuditList(req: NextRequest) {
  requireAdmin(req);
  const q = parseOr422(auditListQuery, searchParams(req));
  const page = await adminService.auditList(q);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages });
}

/* ---------------- media (Phase 3 foundation) ---------------- */

export async function adminMediaList(req: NextRequest) {
  requireAdmin(req);
  const env = getEnv();
  if (env.DATA_PROVIDER !== "supabase") {
    return ok({ items: [], note: "Media library listing requires DATA_PROVIDER=supabase (metadata lives in media_assets). Upload pipeline lands in Phase 4/5." });
  }
  const sb = supabaseAdmin();
  const res = await sb.from("media_assets").select("*").order("created_at", { ascending: false }).limit(200);
  const rows = dbGuard(res.error, res.data) ?? [];
  return ok({ items: rows, note: "Supabase Storage `media` bucket — uploads land in Phase 4/5." });
}
