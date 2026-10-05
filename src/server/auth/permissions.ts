/**
 * Phase 4 — permission catalogue.
 *
 * Handlers ask for a PERMISSION, never for a role name. Roles live in the
 * database (`admin_roles.permissions`), so adding `editor` or `viewer` is an
 * INSERT — no application change. This file only names the permissions that
 * exist so TypeScript can check the call sites.
 */
export const PERMISSIONS = [
  "dashboard.read",
  "content.read",
  "content.write",
  "inbox.read",
  "inbox.write",
  "audit.read",
  "media.read",
  "media.write",
  "settings.read",
  "settings.write",
  "admin.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Roles that exist out of the box. The authoritative list is `admin_roles`. */
export const DEFAULT_ROLES = {
  admin: [...PERMISSIONS],
} satisfies Record<string, readonly Permission[]>;

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
