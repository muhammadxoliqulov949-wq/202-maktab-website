import type { NextRequest } from "next/server";
import type { HandlerResult } from "@/server/types/api";
import { AppError, zodDetails } from "@/server/errors/AppError";
import { newsListQuery, teamListQuery, galleryListQuery, idParam } from "@/server/validation/schemas";
import { newsService, teamService, galleryService, contentService } from "@/server/services/content.services";
import { getContactService } from "@/server/services/contact.service";
import { getEnv, SECURITY_POLICY } from "@/server/config/env";
import { metrics } from "@/server/observability/metrics";

/**
 * Framework-thin controllers: parse → validate → service → HandlerResult.
 * No business logic lives here, so Phase 3 keeps them unchanged when
 * repositories switch to a database.
 */

function searchParams(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

function ok(data: unknown, opts?: { ttlSec?: number; cache?: "HIT" | "MISS"; meta?: Record<string, unknown> }): HandlerResult {
  return {
    status: 200,
    ttlSec: opts?.ttlSec,
    cache: opts?.cache,
    body: { success: true, data, meta: { ...(opts?.meta ?? {}) } },
  };
}

/* ---------------- health ---------------- */

export function health() {
  return ok({ status: "ok", uptimeSec: Math.round(process.uptime()), version: "v1" }, { ttlSec: 0 });
}

export function healthLive() {
  return ok({ status: "live" }, { ttlSec: 0 });
}

export function healthReady() {
  // Phase 2: process is stateless; ready when the event loop answers.
  return ok({ status: "ready", checks: { cache: "memory", queue: "inline" } }, { ttlSec: 0 });
}

/* ---------------- static content ---------------- */

export async function siteConfig() {
  const { value, hit } = await contentService.siteConfig();
  return ok(value, { ttlSec: 1800, cache: hit ? "HIT" : "MISS" });
}

export async function stats() {
  const { value, hit } = await contentService.stats();
  return ok(value, { ttlSec: 1800, cache: hit ? "HIT" : "MISS" });
}

export async function features() {
  const { value, hit } = await contentService.features();
  return ok(value, { ttlSec: 1800, cache: hit ? "HIT" : "MISS" });
}

export async function facilities() {
  const { value, hit } = await contentService.facilities();
  return ok(value, { ttlSec: 1800, cache: hit ? "HIT" : "MISS" });
}

export async function faqs() {
  const { value, hit } = await contentService.faqs();
  return ok(value, { ttlSec: 1800, cache: hit ? "HIT" : "MISS" });
}

export async function quickLinks() {
  const { value, hit } = await contentService.quickLinks();
  return ok(value, { ttlSec: 1800, cache: hit ? "HIT" : "MISS" });
}

export async function contactInfo() {
  const { value, hit } = await contentService.contactInfo();
  return ok(value, { ttlSec: 1800, cache: hit ? "HIT" : "MISS" });
}

/* ---------------- news ---------------- */

export async function newsList(req: NextRequest) {
  const parsed = newsListQuery.safeParse(searchParams(req));
  if (!parsed.success) throw AppError.validation(zodDetails(parsed.error.issues));
  const { value, hit } = await newsService.list(parsed.data);
  return ok(value.items, {
    ttlSec: 120,
    cache: hit ? "HIT" : "MISS",
    meta: { page: value.page, limit: value.limit, total: value.total, totalPages: value.totalPages },
  });
}

export async function newsItem(slug: string) {
  const id = idParam.safeParse(slug);
  if (!id.success) throw AppError.validation(zodDetails(id.error.issues));
  const { value, hit } = await newsService.bySlug(id.data);
  return ok(value, { ttlSec: 900, cache: hit ? "HIT" : "MISS" });
}

/* ---------------- team ---------------- */

export async function teamList(req: NextRequest) {
  const parsed = teamListQuery.safeParse(searchParams(req));
  if (!parsed.success) throw AppError.validation(zodDetails(parsed.error.issues));
  const { value, hit } = await teamService.list(parsed.data);
  return ok(value.items, {
    ttlSec: 600,
    cache: hit ? "HIT" : "MISS",
    meta: { page: value.page, limit: value.limit, total: value.total, totalPages: value.totalPages },
  });
}

export async function teamItem(id: string) {
  const pid = idParam.safeParse(id);
  if (!pid.success) throw AppError.validation(zodDetails(pid.error.issues));
  const { value, hit } = await teamService.byId(pid.data);
  return ok(value, { ttlSec: 900, cache: hit ? "HIT" : "MISS" });
}

/* ---------------- gallery ---------------- */

export async function galleryList(req: NextRequest) {
  const parsed = galleryListQuery.safeParse(searchParams(req));
  if (!parsed.success) throw AppError.validation(zodDetails(parsed.error.issues));
  const { value, hit } = await galleryService.list(parsed.data);
  return ok(value.items, {
    ttlSec: 300,
    cache: hit ? "HIT" : "MISS",
    meta: { page: value.page, limit: value.limit, total: value.total, totalPages: value.totalPages },
  });
}

export async function galleryItem(id: string) {
  const gid = idParam.safeParse(id);
  if (!gid.success) throw AppError.validation(zodDetails(gid.error.issues));
  const { value, hit } = await galleryService.byId(gid.data);
  return ok(value, { ttlSec: 600, cache: hit ? "HIT" : "MISS" });
}

/* ---------------- contact POST ---------------- */

export async function contactSubmit(req: NextRequest) {
  const env = getEnv();

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw AppError.unsupportedMediaType("Content-Type must be application/json");
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (declaredLength > SECURITY_POLICY.maxContactBodyBytes()) {
    throw AppError.payloadTooLarge();
  }

  const raw = await req.text();
  if (raw.length > SECURITY_POLICY.maxContactBodyBytes()) {
    throw AppError.payloadTooLarge();
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw AppError.badRequest("Malformed JSON body");
  }
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw AppError.badRequest("Body must be a JSON object");
  }

  const result = await getContactService().submit(json);
  metrics.increment("http_contact_submissions_total");

  return {
    status: 200,
    ttlSec: 0,
    body: {
      success: true as const,
      data: { received: true, topic: result.topic },
      meta: { processedBy: "queue:inline", env: env.NODE_ENV },
    },
  };
}
