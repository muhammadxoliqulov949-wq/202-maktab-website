import type { NextRequest } from "next/server";
import type { HandlerResult } from "@/server/types/api";
import { AppError, zodDetails } from "@/server/errors/AppError";
import { loginBody } from "@/server/validation/authSchemas";
import * as authService from "@/server/services/auth.service";
import { getRateLimiter, clientKey } from "@/server/middleware/rateLimit";
import { emailHint } from "@/server/auth/csrf";

/**
 * Phase 4 — authentication endpoints (`/api/v1/auth/*`).
 *
 * These are the ONLY routes that accept credentials. They never return tokens:
 * the session travels exclusively in an HttpOnly cookie set by the service.
 */

function ok(data: unknown, meta?: Record<string, unknown>): HandlerResult {
  return { status: 200, body: { success: true, data, meta: meta ?? {} } };
}

export async function authLogin(req: NextRequest): Promise<HandlerResult> {
  if (req.method !== "POST") throw AppError.methodNotAllowed();

  const raw = await req.json().catch(() => null);
  if (raw === null || typeof raw !== "object") throw AppError.badRequest("JSON body required");
  const parsed = loginBody.safeParse(raw);
  if (!parsed.success) throw AppError.validation(zodDetails(parsed.error.issues));

  // Second rate-limit dimension: per submitted e-mail. `wrap()` already limits
  // per client IP; this stops one account being sprayed from many IPs.
  const emailCheck = getRateLimiter().check("auth", `email:${emailHint(parsed.data.email)}`);
  if (!emailCheck.allowed) throw AppError.rateLimited(emailCheck.retryAfterSec, "Too many login attempts. Try again later.");
  // Also keep the IP bucket in sync with the e-mail bucket so both expire together.
  void clientKey(req);

  const view = await authService.login(req, parsed.data);
  return ok(view);
}

export async function authLogout(req: NextRequest): Promise<HandlerResult> {
  if (req.method !== "POST") throw AppError.methodNotAllowed();
  return ok(await authService.logout(req));
}

export async function authSession(req: NextRequest): Promise<HandlerResult> {
  if (req.method !== "GET") throw AppError.methodNotAllowed();
  return ok(await authService.session(req));
}
