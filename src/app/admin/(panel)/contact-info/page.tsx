"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/components/admin/client";
import { Card, ErrorNote, Field, Loading, Toggle, inputCls } from "@/components/admin/ui";

type ContactValue = { display: string; href: string };
type ContactInfo = {
  address: string;
  phone: ContactValue;
  mobile: ContactValue;
  email: ContactValue;
  hours: Array<{ days: string; time: string }>;
  map: { embed: string; route: string; view: string; latitude: number; longitude: number; verified: boolean };
  social: { telegram?: string; instagram?: string };
};

export default function AdminContactInfoPage() {
  const [data, setData] = useState<ContactInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<ContactInfo>("/api/v1/admin/contact-info")
      .then((b) => setData(b.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Xato"));
  }, []);

  if (error && !data) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  const set = (patch: Partial<ContactInfo>) => setData({ ...data, ...patch });
  const setValue = (key: "phone" | "mobile" | "email", part: "display" | "href", v: string) => setData({ ...data, [key]: { ...data[key], [part]: v } });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminFetch("/api/v1/admin/contact-info", { method: "PATCH", body: JSON.stringify(data) });
      setNotice("Saqlandi — public /api/v1/contact-info yangilandi ✓");
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
        <h1 className="font-display text-2xl font-black tracking-tight">Aloqa ma’lumoti</h1>
        <p className="text-sm text-muted">Rasmiy ochiq ma’lumot. Murojaatlar inboxi alohida: /admin/contact</p>
      </header>
      <ErrorNote message={error} />
      {notice ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{notice}</p> : null}

      <Card title="Telefon / email">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon (ko‘rinadigan)">
            <input className={inputCls} value={data.phone.display} onChange={(e) => setValue("phone", "display", e.target.value)} />
          </Field>
          <Field label="Telefon (href)">
            <input className={inputCls} value={data.phone.href} onChange={(e) => setValue("phone", "href", e.target.value)} />
          </Field>
          <Field label="Mobil (ko‘rinadigan)">
            <input className={inputCls} value={data.mobile.display} onChange={(e) => setValue("mobile", "display", e.target.value)} />
          </Field>
          <Field label="Mobil (href)">
            <input className={inputCls} value={data.mobile.href} onChange={(e) => setValue("mobile", "href", e.target.value)} />
          </Field>
          <Field label="Email (ko‘rinadigan)">
            <input className={inputCls} value={data.email.display} onChange={(e) => setValue("email", "display", e.target.value)} />
          </Field>
          <Field label="Email (href)">
            <input className={inputCls} value={data.email.href} onChange={(e) => setValue("email", "href", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card title="Manzil va xarita">
        <div className="flex flex-col gap-4">
          <Field label="Manzil">
            <input className={inputCls} value={data.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kenglik (latitude)">
              <input type="number" step="0.0001" className={inputCls} value={data.map.latitude} onChange={(e) => set({ map: { ...data.map, latitude: Number(e.target.value) } })} />
            </Field>
            <Field label="Uzunlik (longitude)">
              <input type="number" step="0.0001" className={inputCls} value={data.map.longitude} onChange={(e) => set({ map: { ...data.map, longitude: Number(e.target.value) } })} />
            </Field>
            <div className="flex items-end pb-1">
              <span className="flex items-center gap-2 text-sm font-bold">
                <Toggle checked={data.map.verified} onChange={(v) => set({ map: { ...data.map, verified: v } })} label="Tasdiqlangan" />
                Tasdiqlangan
              </span>
            </div>
          </div>
          <Field label="Xarita embed URL" hint="OpenStreetMap embed — iframe src">
            <input className={inputCls} value={data.map.embed} onChange={(e) => set({ map: { ...data.map, embed: e.target.value } })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Yo‘nalish URL">
              <input className={inputCls} value={data.map.route} onChange={(e) => set({ map: { ...data.map, route: e.target.value } })} />
            </Field>
            <Field label="Xarita ko‘rish URL">
              <input className={inputCls} value={data.map.view} onChange={(e) => set({ map: { ...data.map, view: e.target.value } })} />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Ish vaqti">
        <div className="flex flex-col gap-3">
          {data.hours.map((h, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <input
                className={inputCls}
                value={h.days}
                onChange={(e) => set({ hours: data.hours.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)) })}
                placeholder="Dushanba – Shanba"
              />
              <input
                className={inputCls}
                value={h.time}
                onChange={(e) => set({ hours: data.hours.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })}
                placeholder="08:00 – 15:00"
              />
              <button type="button" onClick={() => set({ hours: data.hours.filter((_, j) => j !== i) })} className="rounded-xl border border-line px-3 text-sm font-bold text-red-600 hover:bg-red-500/10">
                ✕
              </button>
            </div>
          ))}
          {data.hours.length < 5 ? (
            <button type="button" onClick={() => set({ hours: [...data.hours, { days: "", time: "" }] })} className="self-start rounded-xl border border-line px-3 py-1.5 text-xs font-bold hover:bg-muted/10">
              + Qator
            </button>
          ) : null}
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
