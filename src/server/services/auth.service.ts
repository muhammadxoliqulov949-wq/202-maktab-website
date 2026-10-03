import "server-only";

import type { NextRequest } from "next/server";
import { AppError } from "@/server/errors/AppError";
import { createJar, createJarSupabase, getSupabaseUser } from "@/lib/supabase/server";
import { SESSION_COOKIE, sessionCookieOptions, supabaseConnection, CSRF_COOKIE, csrfCookieOptions } from "@/lib/supabase/env";
import { repos } from "@/server/repositories";
import { queueResponseCookie, queueResponseCookies } from "@/server/http/requestContext";
import { clearCsrfToken, emailHint, issueCsrfToken } from "@/server/auth/csrf";
import { clientIp, type AdminActor } from "@/server/auth/actor";
import { audit } from "@/server/services/audit";
import { logger } from "@/server/observability/logger";
import type { LoginInput } from "@/server/validation/authSchemas";

/**
 * Phase 4 — Supabase Auth backed sign-in / sign-out / session read.
 *
 * Credentials are verified by GoTrue. This module never sees a password hash,
 * never stores a password and never implements its own credential check.
 *
 * Error policy: the client only ever receives ONE message for a bad login. The
 * Supabase error string, the e-mail and the reason are written to the server
 * log and to the audit trail instead.
 */

const GENERIC_LOGIN_ERROR = "Login failed. Please check your email and password.";

export type SessionView = {
  authenticated: boolean;
  admin: { email: string; role: string; permissions: string[] } | null;
};

function assertAuthConfigured(): void {
  const { url } = supabaseConnection();
  if (!url && !process.env.SUPABASE_URL) {
    throw AppError.serviceUnavailable("Authentication is not configured on this deployment");
  }
}

/**
 * Email + password sign-in.
 *
 * The session cookie is written whenever GoTrue accepts the credentials, even
 * for accounts that turn out not to be admins — authentication and
 * authorization are reported separately (200 vs 403), which is what lets the
 * admin UI explain "signed in, but no admin access" instead of silently
 * bouncing back to the form.
 */
export async function login(req: NextRequest, input: LoginInput): Promise<SessionView> {
  assertAuthConfigured();
  const ip = clientIp(req);

  // Fresh jar: never merge with cookies the caller already sent.
  const jar = createJar([]);
  const supabase = createJarSupabase(jar);

  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (error || !data?.user || !data?.session) {
      logger.warn("login_failed", { reason: error?.name ?? "no_session", emailHash: emailHint(input.email), ip });
      await audit({ userId: null, email: emailHint(input.email), ip }, "LOGIN_FAILED", "auth", null, {
        reason: error?.name ?? "no_session",
      });
      throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
    }
    userId = data.user.id;
    userEmail = String(data.user.email ?? input.email);
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Network / misconfiguration — still a generic message to the client.
    logger.error("login_error", { error: err instanceof Error ? err.name : "unknown", ip });
    throw AppError.unauthorized(GENERIC_LOGIN_ERROR);
  }

  // Authentication succeeded → publish the session cookie.
  queueResponseCookies(jar.drain());

  const admin = await repos().adminUsers.byUserId(userId);

  if (!admin) {
    logger.warn("login_denied", { reason: "not_admin", userId, ip });
    await audit({ userId, email: userEmail, ip }, "LOGIN_DENIED", "auth", userId, { reason: "not_admin" });
    throw AppError.forbidden("This account does not have admin access.");
  }
  if (!admin.isActive) {
    logger.warn("login_denied", { reason: "inactive", userId, ip });
    await audit({ userId, email: admin.email, ip }, "LOGIN_DENIED", "auth", userId, { reason: "inactive" });
    throw AppError.forbidden("This admin account has been deactivated.");
  }

  issueCsrfToken();
  await repos().adminUsers.touchLogin(userId);

  const actor: AdminActor = {
    userId,
    adminUserId: admin.id,
    email: admin.email || userEmail || "",
    role: admin.role,
    permissions: admin.permissions,
    ip,
  };
  await audit(actor, "LOGIN", "auth", userId, { role: admin.role });
  logger.info("login_ok", { userId, role: admin.role, ip });

  return { authenticated: true, admin: { email: actor.email, role: actor.role, permissions: actor.permissions } };
}

/** Sign-out: revokes the refresh token at GoTrue and clears both cookies. */
export async function logout(req: NextRequest): Promise<{ ok: true }> {
  const ip = clientIp(req);
  const jar = createJar(req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })));
  const supabase = createJarSupabase(jar);
  const user = await getSupabaseUser(supabase);

  if (user) {
    const admin = await repos().adminUsers.byUserId(user.id);
    await audit(
      admin && admin.isActive
        ? { userId: user.id, adminUserId: admin.id, email: admin.email, role: admin.role, permissions: admin.permissions, ip }
        : { userId: user.id, email: String(user.email ?? ""), ip },
      "LOGOUT",
      "auth",
      user.id,
      null
    );
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.warn("logout_revoke_failed", { error: err instanceof Error ? err.name : "unknown" });
    }
  }

  // Clear cookies unconditionally — even for an already-expired session.
  queueResponseCookie({ name: SESSION_COOKIE, value: "", options: { ...sessionCookieOptions(), maxAge: 0 } });
  queueResponseCookie({ name: CSRF_COOKIE, value: "", options: { ...csrfCookieOptions(), maxAge: 0 } });
  // jar.drain() may contain a refreshed session written by getUser(); drop it.
  jar.drain();
  clearCsrfToken();
  return { ok: true };
}

/** Non-sensitive session summary — never contains tokens. */
export async function session(req: NextRequest): Promise<SessionView> {
  const jar = createJar(req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })));
  const supabase = createJarSupabase(jar);
  const user = await getSupabaseUser(supabase);
  queueResponseCookies(jar.drain());
  if (!user) return { authenticated: false, admin: null };
  const admin = await repos().adminUsers.byUserId(user.id);
  if (!admin || !admin.isActive) return { authenticated: true, admin: null };
  return { authenticated: true, admin: { email: admin.email, role: admin.role, permissions: admin.permissions } };
}
