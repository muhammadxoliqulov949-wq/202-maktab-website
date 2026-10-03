import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { AppError } from "@/server/errors/AppError";
import { CSRF_COOKIE, csrfCookieOptions } from "@/lib/supabase/env";
import { queueResponseCookie } from "@/server/http/requestContext";

/**
 * Phase 4 — CSRF protection (double-submit token).
 *
 * Why not rely on `SameSite=Lax` alone: Lax already blocks a cross-site page
 * from attaching our cookie to a POST/PATCH/DELETE, but it is a browser
 * behaviour we do not control, and it says nothing about same-site attackers
 * (a compromised sibling subdomain, an injected script on a co-hosted origin).
 * A double-submit token adds a second, independent requirement: the caller must
 * be able to READ a cookie from our origin, which cross-origin JavaScript
 * cannot do.
 *
 * The token is not a cryptographic secret and grants nothing by itself; it is
 * bound to the session cookie (both are cleared together on logout).
 */

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Constant-time comparison that never throws on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length || ba.length === 0) return false;
  return timingSafeEqual(ba, bb);
}

/** Issue/rotate the CSRF cookie (queued onto the current response). */
export function issueCsrfToken(): string {
  const token = newCsrfToken();
  queueResponseCookie({ name: CSRF_COOKIE, value: token, options: csrfCookieOptions() });
  return token;
}

/** Clear the CSRF cookie. */
export function clearCsrfToken(): void {
  queueResponseCookie({ name: CSRF_COOKIE, value: "", options: { ...csrfCookieOptions(), maxAge: 0 } });
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Enforce the double-submit check for state-changing admin requests.
 * Safe methods (GET/HEAD/OPTIONS) are exempt.
 */
export function assertCsrf(req: NextRequest): void {
  if (!UNSAFE.has(req.method)) return;
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value ?? "";
  const headerToken = req.headers.get("x-csrf-token") ?? "";
  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    throw AppError.csrf("Cross-site request rejected — reload the admin panel and try again.");
  }
}

/** Stable, non-reversible hint for audit rows (never the raw e-mail on failures). */
export function emailHint(email: string): string {
  return `sha256:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16)}`;
}
