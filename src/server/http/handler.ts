import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { AppError } from "@/server/errors/AppError";
import { cacheControlFor } from "@/server/config/env";
import { getRateLimiter, clientKey, type RatePolicyName } from "@/server/middleware/rateLimit";
import { createRequestScope } from "@/server/http/requestContext";
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
    // Authenticated surfaces must never be cached by a browser, CDN or proxy.
    const privateSurface = policy === "admin" || policy === "auth";
    // Collects Set-Cookie headers produced by auth (session refresh, login,
    // logout) so controllers need no cookie plumbing. Drained in BOTH paths.
    const scope = createRequestScope();

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
      const result = await scope.run(async () => fn({ req, params }));
      const queuedCookies = scope.drain();
      const bodyText = JSON.stringify(result.body);
      const etag = etagOf(bodyText);

      // Conditional request support for read-only payloads
      const inm = req.headers.get("if-none-match");
      if (result.status === 200 && inm && inm === etag) {
        const duration = Math.round(performance.now() - started);
        metrics.increment("http_requests_total{status=304}");
        metrics.observeDuration(duration);
        logger.info("req", { requestId, method: req.method, path, status: 304, durationMs: duration });
        const res304 = new NextResponse(null, {
          status: 304,
          headers: {
            ETag: etag,
            "X-Request-Id": requestId,
            ...(result.ttlSec ? { "Cache-Control": cacheControlFor(result.ttlSec) } : {}),
          },
        });
        for (const c of queuedCookies) res304.cookies.set(c.name, c.value, c.options);
        return res304;
      }

      metrics.increment(`http_requests_total{status=${result.status}}`);
      const duration = Math.round(performance.now() - started);
      metrics.observeDuration(duration);
      logger.info("req", { requestId, method: req.method, path, status: result.status, durationMs: duration });

      const res = new NextResponse(bodyText, {
        status: result.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
          ETag: etag,
          ...(result.ttlSec ? { "Cache-Control": cacheControlFor(result.ttlSec) } : {}),
          ...(result.cache ? { "X-Cache": result.cache } : {}),
          // A response that writes an auth cookie must never be cached by a
          // CDN or proxy — otherwise one user's session could be replayed.
          ...(queuedCookies.length || privateSurface ? { "Cache-Control": "private, no-store, max-age=0" } : {}),
          ...(result.extraHeaders ?? {}),
        },
      });
      for (const c of queuedCookies) res.cookies.set(c.name, c.value, c.options);
      return res;
    } catch (err) {
      const mapped = errorResponse(err, requestId);
      const duration = Math.round(performance.now() - started);
      metrics.increment(`http_requests_total{status=${mapped.status}}`);
      metrics.observeDuration(duration);
      logger.info("req", { requestId, method: req.method, path, status: mapped.status, durationMs: duration });
      const errRes = new NextResponse(JSON.stringify(mapped.body), {
        status: mapped.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
          ...(mapped.extra ?? {}),
        },
      });
      for (const c of scope.drain()) errRes.cookies.set(c.name, c.value, c.options);
      return errRes;
    }
  };
}
