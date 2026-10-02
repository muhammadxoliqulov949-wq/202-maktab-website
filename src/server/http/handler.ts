import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { AppError } from "@/server/errors/AppError";
import { cacheControlFor } from "@/server/config/env";
import { getRateLimiter, clientKey, type RatePolicyName } from "@/server/middleware/rateLimit";
import { logger } from "@/server/observability/logger";
import { metrics } from "@/server/observability/metrics";
import type { ApiResponse, HandlerResult } from "@/server/types/api";

export type Policy = RatePolicyName | "none";

export type RouteContext = {
  req: NextRequest;
  /** dynamic segment params (awaited) — e.g. { slug } or { id } */
  params: Record<string, string>;
};

export type RouteFn = (ctx: RouteContext) => Promise<HandlerResult> | HandlerResult;

/** Matches Next.js RouteContext expectation for exported handlers. */
type NextSegmentData = { params: Promise<Record<string, string | string[]>> };

function etagOf(body: string): string {
  return `"${createHash("sha1").update(body).digest("base64url").slice(0, 24)}"`;
}

function errorResponse(err: unknown, requestId: string): { status: number; body: ApiResponse<never>; extra?: Record<string, string> } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        success: false,
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
        meta: { requestId },
      },
      extra: err.retryAfterSec ? { "Retry-After": String(err.retryAfterSec) } : undefined,
    };
  }
  // Unknown error — sanitize completely. Details live only in server logs.
  logger.error("unhandled_error", { requestId, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
  return {
    status: 500,
    body: {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      meta: { requestId },
    },
  };
}

/**
 * Wraps a route function with: request-id, structured logging, metrics,
 * rate limiting, ETag/conditional GET, and cache headers.
 * Static assets never pass through here (no expensive limiting on media).
 */
export function wrap(policy: Policy, fn: RouteFn) {
  return async (req: NextRequest, segment: NextSegmentData): Promise<Response> => {
    const started = performance.now();
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    const path = req.nextUrl.pathname;

    try {
      if (policy !== "none") {
        const check = getRateLimiter().check(policy, clientKey(req));
        if (!check.allowed) {
          metrics.increment("http_requests_total{status=429}");
          throw AppError.rateLimited(check.retryAfterSec);
        }
      }

      const rawParams = (await segment?.params) ?? {};
      const params: Record<string, string> = Object.fromEntries(
        Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? (v[0] ?? "") : v])
      );
      const result = await fn({ req, params });
      const bodyText = JSON.stringify(result.body);
      const etag = etagOf(bodyText);

      // Conditional request support for read-only payloads
      const inm = req.headers.get("if-none-match");
      if (result.status === 200 && inm && inm === etag) {
        const duration = Math.round(performance.now() - started);
        metrics.increment("http_requests_total{status=304}");
        metrics.observeDuration(duration);
        logger.info("req", { requestId, method: req.method, path, status: 304, durationMs: duration });
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: etag,
            "X-Request-Id": requestId,
            ...(result.ttlSec ? { "Cache-Control": cacheControlFor(result.ttlSec) } : {}),
          },
        });
      }

      metrics.increment(`http_requests_total{status=${result.status}}`);
      const duration = Math.round(performance.now() - started);
      metrics.observeDuration(duration);
      logger.info("req", { requestId, method: req.method, path, status: result.status, durationMs: duration });

      return new NextResponse(bodyText, {
        status: result.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
          ETag: etag,
          ...(result.ttlSec ? { "Cache-Control": cacheControlFor(result.ttlSec) } : {}),
          ...(result.cache ? { "X-Cache": result.cache } : {}),
          ...(result.extraHeaders ?? {}),
        },
      });
    } catch (err) {
      const mapped = errorResponse(err, requestId);
      const duration = Math.round(performance.now() - started);
      metrics.increment(`http_requests_total{status=${mapped.status}}`);
      metrics.observeDuration(duration);
      logger.info("req", { requestId, method: req.method, path, status: mapped.status, durationMs: duration });
      return new NextResponse(JSON.stringify(mapped.body), {
        status: mapped.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
          ...(mapped.extra ?? {}),
        },
      });
    }
  };
}
