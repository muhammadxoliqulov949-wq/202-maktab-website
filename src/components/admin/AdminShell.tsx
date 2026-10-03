"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AUTH_EVENT, logout } from "@/components/admin/client";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Admin shell — sidebar, signed-in identity and logout.
 *
 * Phase 3's "DEVELOPMENT ONLY" banner and the localStorage dev-token prompt are
 * gone: this shell now only renders for a session that the server layout has
 * already verified (Supabase Auth + active `admin_users` row + role).
 */

const NAV: Array<{ section: string; items: Array<{ href: string; label: string; icon: string }> }> = [
  { section: "Boshqaruv", items: [{ href: "/admin", label: "Dashboard", icon: "▦" }] },
  {
    section: "Kontent",
    items: [
      { href: "/admin/news", label: "Yangiliklar", icon: "✦" },
      { href: "/admin/team", label: "Jamoa", icon: "☾" },
      { href: "/admin/gallery", label: "Galereya", icon: "▣" },
      { href: "/admin/faqs", label: "FAQ", icon: "?" },
      { href: "/admin/facilities", label: "Inshootlar", icon: "⌂" },
      { href: "/admin/features", label: "Imkoniyatlar", icon: "✧" },
      { href: "/admin/statistics", label: "Statistika", icon: "#" },
    ],
  },
  {
    section: "Sayt",
    items: [
      { href: "/admin/settings", label: "Sozlamalar", icon: "⚙" },
      { href: "/admin/contact-info", label: "Aloqa ma’lumoti", icon: "✉" },
      { href: "/admin/quick-links", label: "Tez havolalar", icon: "→" },
    ],
  },
  { section: "Inbox", items: [{ href: "/admin/contact", label: "Murojaatlar", icon: "✉" }] },
  {
    section: "Tizim",
    items: [
      { href: "/admin/audit", label: "Audit jurnali", icon: "≡" },
      { href: "/admin/media", label: "Media", icon: "◉" },
    ],
  },
];

export type AdminShellUser = { email: string; role: string };

export function AdminShell({ user, children }: { user: AdminShellUser; children: ReactNode }) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // A 401 from any admin call means the session expired mid-session.
    const onAuth = () => setSigningOut(true);
    window.addEventListener(AUTH_EVENT, onAuth);

    // Browser Supabase client (anon key only). The session cookie is HttpOnly,
    // so this cannot read the tokens and is NOT the source of truth — the
    // server layout and the API are. It only surfaces Supabase auth lifecycle
    // events, so a sign-out performed elsewhere drops the panel immediately.
    const supabase = createBrowserSupabase();
    const { data } = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setSigningOut(true);
    }) ?? { data: { subscription: undefined } };

    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      data.subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-svh bg-background text-ink">
      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface px-3 py-5 lg:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2" aria-label="Saytga qaytish">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--accent)] font-display text-sm font-black text-white">202</span>
            <span className="font-display text-sm font-extrabold leading-tight">
              Admin CMS
              <span className="block text-[0.68rem] font-semibold text-muted">202-maktab</span>
            </span>
          </Link>
          <nav aria-label="Admin navigatsiya" className="flex flex-col gap-4">
            {NAV.map((group) => (
              <div key={group.section}>
                <p className="px-2 pb-1 text-[0.66rem] font-black uppercase tracking-[0.16em] text-muted">{group.section}</p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[0.84rem] font-semibold transition-colors ${
                            active ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)]" : "text-muted hover:bg-muted/10 hover:text-ink"
                          }`}
                        >
                          <span aria-hidden="true" className="w-4 text-center text-xs opacity-70">
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border border-line px-3 py-2.5">
            <p className="truncate text-[0.78rem] font-bold" title={user.email}>
              {user.email}
            </p>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">{user.role}</p>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void logout();
              }}
              className="mt-2 w-full rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:bg-muted/10 disabled:opacity-60"
            >
              {signingOut ? "Chiqilmoqda…" : "Chiqish"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
          {/* mobile header */}
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{user.email}</p>
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-muted">{user.role}</p>
            </div>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void logout();
              }}
              className="shrink-0 rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted disabled:opacity-60"
            >
              {signingOut ? "…" : "Chiqish"}
            </button>
          </div>
          {/* mobile nav */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {NAV.flatMap((g) => g.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                  pathname === item.href ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent-ink)]" : "border-line text-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
