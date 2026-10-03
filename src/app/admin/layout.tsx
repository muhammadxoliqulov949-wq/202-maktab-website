import type { Metadata } from "next";

/**
 * /admin — Phase 4 admin CMS root layout.
 *
 * Deliberately thin: it only sets metadata. The authenticated shell lives in
 * `./(panel)/layout.tsx` so that `/admin/login` can render WITHOUT the panel
 * chrome and without an auth check of its own.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin CMS — 202-maktab",
    template: "%s — 202-maktab admin",
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
