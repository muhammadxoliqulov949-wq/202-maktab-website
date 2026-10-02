import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * /admin — Phase 3 admin CMS.
 * DEVELOPMENT ONLY: no production authentication in this phase (see banner).
 * The panel talks exclusively to /api/v1/admin/* — never to the database directly.
 */
export const metadata: Metadata = {
  title: "Admin CMS — 202-maktab (development only)",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
