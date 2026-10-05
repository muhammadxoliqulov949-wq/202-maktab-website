"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/client";
import { Card, ErrorNote, Field, Loading, inputCls } from "@/components/admin/ui";

type Settings = {
  name: string;
  fullName: string;
  tagline: string;
  district: string;
  address: string;
  established: string;
  locale: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  social: { telegram?: string; instagram?: string };
};

export default function AdminSettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<Settings>("/api/v1/admin/settings")
      .then((b) => setData(b.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Xato"));
  }, []);

  if (error && !data) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const set = (patch: Partial<Settings>) => setData({ ...data, ...patch });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/v1/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
          fullName: data.fullName,
          tagline: data.tagline,
          district: data.district,
          address: data.address,
          established: data.established,
          social: { telegram: data.social.telegram ?? "", instagram: data.social.instagram ?? "" },
        }),
      });
      setNotice("Saqlandi — public /api/v1/site-config yangilandi ✓");
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <header>
        <h1 className="font-display text-2xl font-black tracking-tight">Sayt sozlamalari</h1>
        <p className="text-sm text-muted">Sayt identikati — barcha qiymatlar bazadan keladi</p>
      </header>
      <ErrorNote message={error} />
      {notice ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{notice}</p> : null}

      <Card title="Identikat">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maktab nomi (qisqa)">
            <input className={inputCls} value={data.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="To‘liq nomi">
            <input className={inputCls} value={data.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </Field>
          <Field label="Shior">
            <input className={inputCls} value={data.tagline} onChange={(e) => set({ tagline: e.target.value })} />
          </Field>
          <Field label="Tuman">
            <input className={inputCls} value={data.district} onChange={(e) => set({ district: e.target.value })} />
          </Field>
          <Field label="Manzil">
            <input className={inputCls} value={data.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label="Tashkil etilgan">
            <input className={inputCls} value={data.established} onChange={(e) => set({ established: e.target.value })} placeholder="19XX — hozircha prototip" />
          </Field>
        </div>
      </Card>

      <Card title="Ijtimoiy tarmoqlar">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telegram">
            <input className={inputCls} value={data.social.telegram ?? ""} onChange={(e) => set({ social: { ...data.social, telegram: e.target.value } })} />
          </Field>
          <Field label="Instagram">
            <input className={inputCls} value={data.social.instagram ?? ""} onChange={(e) => set({ social: { ...data.social, instagram: e.target.value } })} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[color:var(--accent)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
          {saving ? "Saqlanmoqda…" : "Saqlash"}
        </button>
      </div>
    </div>
  );
}
