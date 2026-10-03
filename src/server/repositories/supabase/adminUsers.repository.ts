import "server-only";

import type { AdminUserRepository } from "@/server/repositories/interfaces";
import type { Paginated } from "@/server/types/api";
import type { AdminUserRow } from "@/server/repositories/types";
import { supabaseAdmin } from "@/server/repositories/supabase/client";
import { dbGuard, meta, rangeFor } from "@/server/repositories/supabase/db";

/**
 * Phase 4 — `admin_users` (+ the `admin_roles` permission catalogue).
 *
 * Service role is used here on purpose: an administrator must be able to grant
 * or revoke *someone else's* access, which a `using`-clause policy on the
 * subject's own row cannot express. Reads of the caller's own row are also
 * possible through the `admin_users_select_self` RLS policy with a plain
 * authenticated client (see docs/AUTH.md §4).
 */

type RoleEmbed = { role?: string; description?: string | null; permissions?: string[] | null } | null;

function fromDb(d: Record<string, unknown>): AdminUserRow {
  const embedded = d.admin_roles as RoleEmbed;
  return {
    id: String(d.id ?? ""),
    userId: String(d.user_id ?? ""),
    email: String(d.email ?? ""),
    role: String(d.role ?? "admin"),
    isActive: Boolean(d.is_active),
    permissions: Array.isArray(embedded?.permissions) ? (embedded!.permissions as string[]) : [],
    createdAt: String(d.created_at ?? ""),
    updatedAt: String(d.updated_at ?? ""),
    lastLoginAt: (d.last_login_at as string | null) ?? null,
  };
}

const SELECT = "*, admin_roles(role, description, permissions)";

class SupabaseAdminUserRepository implements AdminUserRepository {
  async byUserId(userId: string): Promise<AdminUserRow | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("admin_users").select(SELECT).eq("user_id", userId).maybeSingle();
    const row = dbGuard(error, data) as Record<string, unknown> | null;
    return row ? fromDb(row) : null;
  }

  async list(q: { page: number; limit: number }): Promise<Paginated<AdminUserRow>> {
    const sb = supabaseAdmin();
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sb.from("admin_users").select(SELECT, { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
    const rows = (dbGuard(res.error, res.data) as Array<Record<string, unknown>> | null) ?? [];
    return { ...meta(res.count, q.page, q.limit), items: rows.map(fromDb) };
  }

  async create(row: { userId: string; email: string; role: string; isActive: boolean }): Promise<AdminUserRow> {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("admin_users")
      .upsert({ user_id: row.userId, email: row.email.toLowerCase(), role: row.role, is_active: row.isActive }, { onConflict: "user_id" })
      .select(SELECT)
      .single();
    return fromDb(dbGuard(error, data) as Record<string, unknown>);
  }

  async setActive(id: string, isActive: boolean): Promise<AdminUserRow | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("admin_users").update({ is_active: isActive }).eq("id", id).select(SELECT).maybeSingle();
    const row = dbGuard(error, data) as Record<string, unknown> | null;
    return row ? fromDb(row) : null;
  }

  async setRole(id: string, role: string): Promise<AdminUserRow | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("admin_users").update({ role }).eq("id", id).select(SELECT).maybeSingle();
    const row = dbGuard(error, data) as Record<string, unknown> | null;
    return row ? fromDb(row) : null;
  }

  async touchLogin(userId: string): Promise<void> {
    const sb = supabaseAdmin();
    // Best effort — a failure here must never block a successful login.
    await sb.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("user_id", userId);
  }

  async remove(id: string): Promise<boolean> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("admin_users").delete().eq("id", id).select("id");
    const rows = dbGuard(error, data) as Array<{ id: string }> | null;
    return (rows?.length ?? 0) > 0;
  }

  async roles(): Promise<Array<{ role: string; description: string | null; permissions: string[] }>> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("admin_roles").select("role, description, permissions").order("role");
    const rows = (dbGuard(error, data) as Array<Record<string, unknown>> | null) ?? [];
    return rows.map((r) => ({
      role: String(r.role ?? ""),
      description: (r.description as string | null) ?? null,
      permissions: Array.isArray(r.permissions) ? (r.permissions as string[]) : [],
    }));
  }
}

export const supabaseAdminUserRepository = new SupabaseAdminUserRepository();
