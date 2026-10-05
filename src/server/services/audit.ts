import { repos } from "@/server/repositories";
import { logger } from "@/server/observability/logger";
import type { AuditAction, AuditRow } from "@/server/repositories/types";
import type { AdminActor } from "@/server/auth/actor";

/** What the admin service passes to `audit()` — the verified administrator. */
export type AdminIdentity = AdminActor;

/**
 * Phase 4 audit trail.
 *
 * Every entry carries the REAL Supabase Auth user id — never a placeholder like
 * the Phase 3 `"dev-token"` mechanism label. Failure to append is logged but
 * never blocks the mutation it describes.
 *
 * Secrets are never accepted here: the caller passes an actor, not a request,
 * so there is no path by which a password, access token, refresh token or
 * service key could be forwarded into `metadata`.
 */

/** Keys that must never appear in audit metadata, even if a caller tries. */
const FORBIDDEN_METADATA_KEYS = [
  "password",
  "pass",
  "secret",
  "token",
  "access_token",
  "refresh_token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "service_role",
  "servicerolekey",
];

function sanitizeMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!metadata) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.includes(k.toLowerCase())) continue;
    out[k] = v;
  }
  return out;
}

/** Actor-less entry (failed logins, where there is no admin identity yet). */
export type AuditSubject =
  | AdminActor
  | { userId: string | null; adminUserId?: string | null; email?: string | null; ip?: string | null };

export async function audit(
  subject: AuditSubject | null,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown> | null
): Promise<void> {
  try {
    await repos().audit.append({
      adminIdentifier: subject && "role" in subject ? `supabase-auth:${subject.role}` : null,
      adminUserId: subject?.userId ?? null,
      adminEmail: (subject && "email" in subject ? (subject.email as string | null) : null) ?? null,
      ipAddress: (subject && "ip" in subject ? (subject.ip as string | null) : null) ?? null,
      action,
      entityType,
      entityId,
      metadata: sanitizeMetadata(metadata),
    });
  } catch (err) {
    logger.error("audit_append_failed", {
      entity: entityType,
      action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export type { AuditRow };
