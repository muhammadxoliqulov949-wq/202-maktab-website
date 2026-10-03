import "server-only";

import { AppError } from "@/server/errors/AppError";
import { repos } from "@/server/repositories";
import { audit } from "@/server/services/audit";
import type { AdminActor } from "@/server/auth/actor";

/**
 * Phase 4 — administrator directory management (`admin.manage` permission).
 *
 * Granting access means linking an EXISTING Supabase Auth user id to a role.
 * Passwords are never handled here: they live in Supabase Auth and are created
 * either through the dashboard or `scripts/admin-user.mjs`.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const adminUsersService = {
  async list(q: { page: number; limit: number }) {
    const [page, roles] = await Promise.all([repos().adminUsers.list(q), repos().adminUsers.roles()]);
    return { page, roles };
  },

  async grant(input: { userId: string; email: string; role: string; isActive: boolean }, actor: AdminActor) {
    const userId = input.userId.trim().toLowerCase();
    if (!UUID_RE.test(userId)) throw AppError.validation([{ field: "userId", message: "must be a Supabase Auth UUID" }]);
    const email = input.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      throw AppError.validation([{ field: "email", message: "must be a valid email address" }]);
    }
    const roles = await repos().adminUsers.roles();
    if (!roles.some((r) => r.role === input.role)) {
      throw AppError.validation([{ field: "role", message: `unknown role "${input.role}"` }]);
    }

    const created = await repos().adminUsers.create({ userId, email, role: input.role, isActive: input.isActive });
    await audit(actor, "ADMIN_GRANT", "admin-user", created.id, { userId, role: created.role, isActive: created.isActive });
    return created;
  },

  async patch(id: string, patch: { isActive?: boolean; role?: string }, actor: AdminActor) {
    const r = repos().adminUsers;
    let row = null as Awaited<ReturnType<typeof r.setActive>>;
    if (patch.isActive !== undefined) row = await r.setActive(id, patch.isActive);
    if (row && patch.role !== undefined) row = await r.setRole(id, patch.role);
    if (!row && patch.role !== undefined) row = await r.setRole(id, patch.role);
    if (!row) throw AppError.notFound("Admin user not found");
    await audit(actor, patch.isActive === false ? "ADMIN_REVOKE" : "UPDATE", "admin-user", row.id, {
      isActive: row.isActive,
      role: row.role,
    });
    return row;
  },

  async remove(id: string, actor: AdminActor) {
    if (id === actor.adminUserId) throw AppError.badRequest("You cannot remove your own admin access");
    const removed = await repos().adminUsers.remove(id);
    if (!removed) throw AppError.notFound("Admin user not found");
    await audit(actor, "ADMIN_REVOKE", "admin-user", id, { hard: true });
    return { removed: true };
  },
};
