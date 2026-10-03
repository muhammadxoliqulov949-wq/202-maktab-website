import { forbidden, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminActorForRender } from "@/server/auth/actor";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * Authenticated admin panel — server-side gate.
 *
 * Runs on EVERY request (no caching) and enforces, in order:
 *   1. a Supabase Auth session verified against GoTrue  → otherwise /admin/login
 *   2. an `admin_users` row for that user id            → otherwise 403 screen
 *   3. `is_active = true`                               → otherwise 403 screen
 *
 * The middleware redirect is only a fast path; this component is the real page
 * gate, and every `/api/v1/admin/*` call re-checks all of it independently.
 */
export const metadata: Metadata = {
  title: "Admin CMS — 202-maktab",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, actor } = await getAdminActorForRender();

  if (!authenticated) redirect("/admin/login");
  // Authenticated, but no active admin_users row → a real HTTP 403
  // (rendered by src/app/forbidden.tsx).
  if (!actor) forbidden();

  return (
    <AdminShell user={{ email: actor.email, role: actor.role }}>
      {children}
    </AdminShell>
  );
}
