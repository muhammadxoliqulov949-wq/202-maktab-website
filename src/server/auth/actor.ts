import "server-only";

import type { NextRequest } from "next/server";
import { AppError } from "@/server/errors/AppError";
import { createJar, createJarSupabase, createRequestSupabase, getSupabaseUser, type CookieJar } from "@/lib/supabase/server";
import { repos } from "@/server/repositories";
import { queueResponseCookies } from "@/server/http/requestContext";
import { assertCsrf } from "@/server/auth/csrf";
import type { Permission } from "@/server/auth/permissions";

/**
 * Phase 4 — the authorization gate.
 *
 * EVERY `/api/v1/admin/*` handler calls `requireAdminActor()` itself. Nothing is
 * inferred from the Referer, from the fact the caller "came from /admin", or
 * from a client-supplied role. A direct `curl` with no cookie gets 401; a valid
 * Supabase session that has no `admin_users` row (or an inactive one) gets 403.
 *
 * Order of checks (cheapest and least revealing first):
 *   1. session cookie → verified against GoTrue (`getUser()`, not a JWT decode)
 *   2. CSRF double-submit token (unsafe methods only)
 *   3. `admin_users` row exists
 *   4. `is_active = true`
 *   5. role grants the required permission
 */

export type AdminActor = {
  /** Supabase Auth user id (auth.users.id). */
  userId: string;
  /** admin_users.id */
  adminUserId: string;
  email: string;
  role: string;
  permissions: string[];
  ip: string | null;
};

/** Backwards-compatible alias used by the audit helper signatures. */
export type AdminIdentity = AdminActor;

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  const real = req.headers.get("x-real-ip");
  return real ? real.slice(0, 64) : null;
}

/** Verify the session in a jar and resolve the admin record. Never throws. */
async function resolveActor(jar: CookieJar, ip: string | null): Promise<AdminActor | null> {
  const supabase = createJarSupabase(jar);
  const user = await getSupabaseUser(supabase);
  // A refresh may have rewritten the session cookie — always propagate it.
  queueResponseCookies(jar.drain());
  if (!user) return null;

  const admin = await repos().adminUsers.byUserId(user.id);
  if (!admin || !admin.isActive) return null;

  return {
    userId: user.id,
    adminUserId: admin.id,
    email: admin.email || String(user.email ?? ""),
    role: admin.role,
    permissions: admin.permissions,
    ip,
  };
}

/**
 * Route Handlers. Returns the actor or throws 401 / 403.
 * `permission` defaults to the lowest-privilege read permission.
 */
export async function requireAdminActor(req: NextRequest, permission: Permission = "dashboard.read"): Promise<AdminActor> {
  const jar = createJar(req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })));
  const ip = clientIp(req);

  const supabase = createJarSupabase(jar);
  const user = await getSupabaseUser(supabase);
  queueResponseCookies(jar.drain());
  if (!user) throw AppError.unauthorized("Authentication required");

  assertCsrf(req);

  const admin = await repos().adminUsers.byUserId(user.id);
  if (!admin) throw AppError.forbidden("This account does not have admin access");
  if (!admin.isActive) throw AppError.forbidden("This admin account is deactivated");
  if (!admin.permissions.includes(permission)) {
    throw AppError.forbidden(`This role cannot perform that action (missing permission: ${permission})`);
  }

  return {
    userId: user.id,
    adminUserId: admin.id,
    email: admin.email || String(user.email ?? ""),
    role: admin.role,
    permissions: admin.permissions,
    ip,
  };
}

/**
 * Server Components (the `/admin` layout). Non-throwing: returns
 * `{ authenticated, actor }` so the UI can distinguish "not signed in"
 * (→ redirect to /admin/login) from "signed in but not an admin" (→ 403 screen).
 */
export async function getAdminActorForRender(): Promise<{ authenticated: boolean; actor: AdminActor | null }> {
  const { supabase, jar } = await createRequestSupabase();
  const user = await getSupabaseUser(supabase);
  queueResponseCookies(jar.drain());
  if (!user) return { authenticated: false, actor: null };
  const admin = await repos().adminUsers.byUserId(user.id);
  if (!admin || !admin.isActive) return { authenticated: true, actor: null };
  return {
    authenticated: true,
    actor: {
      userId: user.id,
      adminUserId: admin.id,
      email: admin.email || String(user.email ?? ""),
      role: admin.role,
      permissions: admin.permissions,
      ip: null,
    },
  };
}

/** Shared resolution helper (used by the auth service for logout auditing). */
export async function peekActor(req: NextRequest): Promise<AdminActor | null> {
  const jar = createJar(req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })));
  return resolveActor(jar, clientIp(req));
}
