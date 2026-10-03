import { AdminForbidden } from "@/components/admin/AdminForbidden";

/**
 * Boundary rendered by Next.js when a Server Component calls `forbidden()`.
 * Phase 4 uses it for `/admin` when a valid Supabase session exists but the
 * account has no active `admin_users` row — the response status is 403.
 */
export default function ForbiddenPage() {
  return <AdminForbidden />;
}
