"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/components/admin/client";
import { Card, ErrorNote, Loading } from "@/components/admin/ui";

type MediaRow = {
  id: string;
  file_name: string;
  public_url: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  created_at: string;
};

const fmtBytes = (n: number | null): string => {
  if (n == null) return "—";
  return n > 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml,video/mp4,video/webm,application/pdf";

export default function AdminMediaPage() {
  const [data, setData] = useState<{ items: MediaRow[]; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [alt, setAlt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const body = await adminFetch<{ items: MediaRow[]; note: string }>("/api/v1/admin/media");
      setData(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.set("file", file);
      if (alt.trim()) form.set("alt", alt.trim());
      await adminFetch("/api/v1/admin/media", { method: "POST", body: form });
      setNotice(`“${file.name}” yuklandi.`);
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklash muvaffaqiyatsiz");
    } finally {
      setUploading(false);
    }
  }

  async function remove(row: MediaRow) {
    if (!window.confirm(`“${row.file_name}” o‘chirilsinmi?`)) return;
    setError(null);
    try {
      await adminFetch(`/api/v1/admin/media/${row.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "O‘chirish muvaffaqiyatsiz");
    }
  }

  if (!data && !error) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-2xl font-black tracking-tight">Media kutubxonasi</h1>
        <p className="text-sm text-muted">{data?.note ?? ""}</p>
      </header>

      <ErrorNote message={error} />
      {notice ? <p className="rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{notice}</p> : null}

      <Card title="Yuklash">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-muted">Muqobil matn (alt)</span>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              maxLength={300}
              placeholder="Rasmda nima tasvirlangan?"
              className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm outline-none focus:border-[color:var(--accent)]"
            />
          </label>
          <label className="cursor-pointer rounded-xl border border-dashed border-line bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted/10">
            {uploading ? "Yuklanmoqda…" : "Fayl tanlash"}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              disabled={uploading}
              className="sr-only"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
        </div>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-xs text-muted">

          <li>Ruxsat etilgan: JPEG, PNG, WebP, GIF, AVIF, SVG, MP4, WebM, PDF.</li>
          <li>Eng ko‘p 8 MB. Fayl nomi saqlanmaydi — obyekt yo‘li serverda yaratiladi.</li>
          <li>Yozish huquqi Supabase Storage RLS siyosati bilan tekshiriladi (faqat faol admin).</li>
        </ul>
      </Card>

      {(data?.items.length ?? 0) === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-muted">`media_assets` hozircha bo‘sh.</p>
        </Card>
      ) : (
        <Card title="Metadata">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
                  <th className="pb-2 pr-4 font-bold">Fayl</th>
                  <th className="pb-2 pr-4 font-bold">Turi</th>
                  <th className="pb-2 pr-4 font-bold">Hajm</th>
                  <th className="pb-2 pr-4 font-bold">URL</th>
                  <th className="pb-2 font-bold">Amal</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((m) => (
                  <tr key={m.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold">
                      {m.file_name}
                      {m.alt_text ? <span className="block text-xs font-normal text-muted">{m.alt_text}</span> : null}
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{m.mime_type ?? "—"}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{fmtBytes(m.size_bytes)}</td>
                    <td className="py-2.5 pr-4">
                      <a href={m.public_url} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--accent-ink)] hover:underline">
                        ochish ↗
                      </a>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => remove(m)}
                        className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10"
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
