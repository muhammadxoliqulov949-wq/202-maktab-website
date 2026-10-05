import type { NextRequest } from "next/server";
import type { HandlerResult } from "@/server/types/api";
import { AppError, zodDetails } from "@/server/errors/AppError";
import { adminService, type CollectionName } from "@/server/services/admin.service";
import { requireAdminActor } from "@/server/auth/actor";
import { getUserAccessToken } from "@/lib/supabase/server";
import * as mediaService from "@/server/services/media.service";
import { adminUsersService } from "@/server/services/adminUsers.service";
import { adminUserGrantSchema, adminUserPatchSchema } from "@/server/validation/adminSchemas";
import { slugify } from "@/server/validation/adminSchemas";
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
  await requireAdminActor(req, "dashboard.read");
  return ok(await adminService.dashboard());
}

/* ---------------- news ---------------- */

export async function adminNewsList(req: NextRequest) {
  await requireAdminActor(req, "content.read");
  const q = parseOr422(adminListQuery, searchParams(req));
  const [page, categories] = await Promise.all([adminService.newsList(q), adminService.newsCategories()]);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages, categories });
}

export async function adminNewsGet(req: NextRequest, id?: string) {
  await requireAdminActor(req, "content.read");
  return ok(await adminService.newsGet(assertId(id)));
}

export async function adminNewsCreate(req: NextRequest) {
  const ident = await requireAdminActor(req, "content.write");
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const input = parseOr422(newsCreateSchema, body);
  return created(await adminService.newsCreate(input, ident));
}

export async function adminNewsUpdate(req: NextRequest, id?: string) {
  const ident = await requireAdminActor(req, "content.write");
  const pid = assertId(id);
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const patch = parseOr422(newsUpdateSchema, body);
  return ok(await adminService.newsUpdate(pid, patch, ident));
}

export async function adminNewsDelete(req: NextRequest, id?: string) {
  const ident = await requireAdminActor(req, "content.write");
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
  await requireAdminActor(req, "content.read");
  const name = collectionName(entity);
  const q = parseOr422(adminCollectionQuery, searchParams(req));
  const page = await adminService.collectionList(name, q);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages });
}

export async function adminCollectionGet(req: NextRequest, entity: string, id?: string) {
  await requireAdminActor(req, "content.read");
  return ok(await adminService.collectionGet(collectionName(entity), assertId(id)));
}

export async function adminCollectionCreate(req: NextRequest, entity: string) {
  const ident = await requireAdminActor(req, "content.write");
  const name = collectionName(entity);
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const input = parseOr422(SCHEMAS[name].create, body) as Record<string, unknown>;
  return created(await adminService.collectionCreate(name, rowFromCreate(name, input), ident));
}

export async function adminCollectionUpdate(req: NextRequest, entity: string, id?: string) {
  const ident = await requireAdminActor(req, "content.write");
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
  const ident = await requireAdminActor(req, "content.write");
  return ok(await adminService.collectionDelete(collectionName(entity), assertId(id), ident));
}

export async function adminCollectionReorder(req: NextRequest, entity: string) {
  const ident = await requireAdminActor(req, "content.write");
  const body = await req.json().catch(() => null);
  const parsed = parseOr422(reorderSchema, body);
  return ok(await adminService.collectionReorder(collectionName(entity), parsed.ids, ident));
}

/* ---------------- settings ---------------- */

export async function adminSettingsGet(req: NextRequest) {
  await requireAdminActor(req, "settings.read");
  return ok(await adminService.settingsGet());
}

export async function adminSettingsPatch(req: NextRequest) {
  const ident = await requireAdminActor(req, "settings.write");
  const body = await req.json().catch(() => null);
  const patch = parseOr422(settingsPatchSchema, body);
  return ok(await adminService.settingsPatch(patch, ident));
}

export async function adminContactInfoGet(req: NextRequest) {
  await requireAdminActor(req, "settings.read");
  return ok(await adminService.contactInfoGet());
}

export async function adminContactInfoPatch(req: NextRequest) {
  const ident = await requireAdminActor(req, "settings.write");
  const body = await req.json().catch(() => null);
  const patch = parseOr422(contactInfoPatchSchema, body);
  return ok(await adminService.contactInfoPatch(patch, ident));
}

/* ---------------- submissions ---------------- */

export async function adminSubmissionsList(req: NextRequest) {
  await requireAdminActor(req, "inbox.read");
  const q = parseOr422(adminSubmissionsQuery, searchParams(req));
  const page = await adminService.submissionsList(q);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages });
}

export async function adminSubmissionStatus(req: NextRequest, id?: string) {
  const ident = await requireAdminActor(req, "inbox.write");
  const pid = assertId(id);
  const body = await req.json().catch(() => null);
  const { status } = parseOr422(submissionStatusSchema, body);
  return ok(await adminService.submissionStatus(pid, status, ident));
}

export async function adminSubmissionDelete(req: NextRequest, id?: string) {
  const ident = await requireAdminActor(req, "inbox.write");
  return ok(await adminService.submissionDelete(assertId(id), ident));
}

/* ---------------- audit ---------------- */

export async function adminAuditList(req: NextRequest) {
  await requireAdminActor(req, "audit.read");
  const q = parseOr422(auditListQuery, searchParams(req));
  const page = await adminService.auditList(q);
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages });
}

/* ---------------- media (Phase 4) ---------------- */

export async function adminMediaList(req: NextRequest) {
  await requireAdminActor(req, "media.read");
  return ok(await mediaService.listMedia());
}

/**
 * POST /api/v1/admin/media — multipart/form-data with a `file` field.
 * Authorization: media.write. The Storage write runs under the admin's own JWT
 * so the `media_admin_write` RLS policy is the real gate.
 */
export async function adminMediaUpload(req: NextRequest) {
  const actor = await requireAdminActor(req, "media.write");

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw AppError.unsupportedMediaType("Use multipart/form-data with a `file` field");
  }

  const maxBytes = getEnv().MEDIA_MAX_BYTES;
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw AppError.payloadTooLarge("File is too large");

  const form = await req.formData().catch(() => null);
  if (!form) throw AppError.badRequest("Could not parse multipart body");
  const file = form.get("file");
  if (!(file instanceof File)) throw AppError.validation([{ field: "file", message: "a file is required" }]);

  const altText = typeof form.get("alt") === "string" ? String(form.get("alt")).slice(0, 300) : null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const accessToken = await getUserAccessToken(req);
  if (!accessToken) throw AppError.unauthorized("Authentication required");

  const row = await mediaService.uploadMedia(
    { filename: file.name || "upload.bin", mimeType: file.type || "application/octet-stream", bytes, altText },
    accessToken,
    actor
  );
  return created(row);
}

export async function adminMediaDelete(req: NextRequest, id?: string) {
  const actor = await requireAdminActor(req, "media.write");
  const accessToken = await getUserAccessToken(req);
  return ok(await mediaService.deleteMedia(assertId(id), accessToken, actor));
}

/* ---------------- admin users (Phase 4, admin.manage) ---------------- */

export async function adminUsersList(req: NextRequest) {
  await requireAdminActor(req, "admin.manage");
  const q = parseOr422(adminListQuery, searchParams(req));
  const { page, roles } = await adminUsersService.list({ page: q.page, limit: q.limit });
  return ok(page.items, { page: page.page, limit: page.limit, total: page.total, totalPages: page.totalPages, roles });
}

export async function adminUsersGrant(req: NextRequest) {
  const actor = await requireAdminActor(req, "admin.manage");
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const input = parseOr422(adminUserGrantSchema, body);
  return created(await adminUsersService.grant(input, actor));
}

export async function adminUserPatch(req: NextRequest, id?: string) {
  const actor = await requireAdminActor(req, "admin.manage");
  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") throw AppError.badRequest("JSON body required");
  const patch = parseOr422(adminUserPatchSchema, body);
  return ok(await adminUsersService.patch(assertId(id), patch, actor));
}

export async function adminUserRemove(req: NextRequest, id?: string) {
  const actor = await requireAdminActor(req, "admin.manage");
  return ok(await adminUsersService.remove(assertId(id), actor));
}
