import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

/**
 * /admin/login — the only unauthenticated admin route.
 * Sits OUTSIDE the `(panel)` route group on purpose, so it renders without the
 * authenticated shell and without an auth check of its own.
 */
export const metadata: Metadata = {
  title: "Kirish — 202-maktab admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  // Only ever redirect back into /admin — never to an arbitrary URL.
  const next = typeof raw === "string" && raw.startsWith("/admin") && !raw.startsWith("//") ? raw : "/admin";
  return <LoginForm next={next} />;
}
