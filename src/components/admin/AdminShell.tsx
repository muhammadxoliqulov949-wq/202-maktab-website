"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AUTH_EVENT, getToken, setToken } from "@/components/admin/client";

/**
 * Admin shell — sidebar + DEVELOPMENT ONLY banner + dev-token prompt.
 * The token gate is an honest development convenience, NOT authentication.
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

function TokenPrompt({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Admin kaliti">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl">
        <p className="rounded-xl bg-amber-500/12 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Development only — Phase 3
        </p>
        <h2 className="mt-3 font-display text-xl font-extrabold">Admin ruxsat kaliti</h2>
        <p className="mt-1 text-sm text-muted">
          Server <code className="rounded bg-muted/15 px-1">ADMIN_DEV_TOKEN</code> sozlangan. Kalitni kiriting (brauzerda saqlanadi, faqat shu origin’ga yuboriladi).
          Phase 4’da real autentifikatsiya bo‘ladi.
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              setToken(value);
              onDone();
            }
          }}
          autoFocus
          className="mt-4 w-full rounded-xl border border-line bg-background px-3.5 py-2.5 outline-none focus:border-[color:var(--accent)]"
          placeholder="x-admin-dev-token"
        />
        {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (!value.trim()) {
                setError("Kalit bo‘sh bo‘lmasin");
                return;
              }
              setToken(value);
              onDone();
            }}
            className="flex-1 rounded-xl bg-[color:var(--accent)] px-4 py-2.5 font-bold text-white hover:opacity-90"
          >
            Saqlash
          </button>
          <button type="button" onClick={() => setToken("")} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-muted/10">
            Tozalash
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [needToken, setNeedToken] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onAuth = () => setNeedToken(true);
    window.addEventListener(AUTH_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_EVENT, onAuth);
  }, []);

  return (
    <div className="min-h-svh bg-background text-ink">
      <p className="bg-amber-500/15 px-4 py-1.5 text-center text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
        Development only — 202-maktab admin (Phase 3) · real autentifikatsiya Phase 4’da
      </p>
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
          <button
            type="button"
            onClick={() => setNeedToken(true)}
            className="mt-auto rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted hover:bg-muted/10"
          >
            Kalitni o‘zgartirish
          </button>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
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
          <div key={reloadKey}>{children}</div>
        </main>
      </div>
      {needToken ? (
        <TokenPrompt
          onDone={() => {
            setNeedToken(false);
            setReloadKey((k) => k + 1); // refetch all admin data with the new token
          }}
        />
      ) : null}
      {/* keep getToken import referenced for tree-shaking clarity */}
      <span hidden>{typeof getToken()}</span>
    </div>
  );
}
