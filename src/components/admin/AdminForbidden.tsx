"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/components/admin/client";

/**
 * Shown when a VALID Supabase session exists but the account has no active
 * `admin_users` row. The API answers 403 for the same identity — this screen is
 * the page-level mirror of that, not the security boundary.
 */
export function AdminForbidden() {
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-xl">
        <p className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-500/12 font-display text-lg font-black text-red-600">403</p>
        <h1 className="mt-4 font-display text-2xl font-extrabold">Ruxsat yo’q</h1>
        <p className="mt-2 text-sm text-muted">
          Siz tizimga kirgansiz, lekin bu hisob admin paneliga ruxsat etilmagan yoki admin huquqi o‘chirilgan.
        </p>
        <p className="mt-3 text-xs text-muted">
          Admin huquqini faqat maktab administratori bera oladi.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void logout();
            }}
            className="flex-1 rounded-xl bg-[color:var(--accent)] px-4 py-2.5 font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Chiqilmoqda…" : "Chiqish"}
          </button>
          <Link href="/" className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-muted/10">
            Saytga
          </Link>
        </div>
      </div>
    </div>
  );
}
