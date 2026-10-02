import "server-only";
import { AppError } from "@/server/errors/AppError";
import { logger } from "@/server/observability/logger";

/**
 * Small guards for PostgREST responses. Database failures must surface as
 * clean 503s (never stack traces, never connection strings).
 */
export function dbGuard<T>(error: { message: string } | null, data: T): T {
  if (error) {
    logger.error("db_error", { message: error.message.slice(0, 200) }); // no DSN, no key material
    throw AppError.serviceUnavailable("Data source temporarily unavailable");
  }
  return data;
}

/** Escape user-provided search fragments for PostgREST `ilike` patterns. */
export function likeSafe(input: string): string {
  return input.replace(/[%_,()*]/g, " ").trim().slice(0, 100);
}

export function rangeFor(page: number, limit: number): { from: number; to: number } {
  const safePage = Math.max(1, page);
  return { from: (safePage - 1) * limit, to: safePage * limit - 1 };
}

export function meta(total: number | null, page: number, limit: number) {
  const t = total ?? 0;
  return { total: t, page: Math.min(page, Math.max(1, Math.ceil(t / limit) || 1)), limit, totalPages: Math.max(1, Math.ceil(t / limit)) };
}
