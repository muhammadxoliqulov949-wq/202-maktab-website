"use client";

import { useEffect, useState } from "react";
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

const fmtBytes = (n: number | null): string => (n == null ? "—" : `${(n / 1024).toFixed(1)} KB`);

export default function AdminMediaPage() {
  const [data, setData] = useState<{ items: MediaRow[]; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ items: MediaRow[]; note: string }>("/api/v1/admin/media")
      .then((b) => setData(b.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Xato"));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-2xl font-black tracking-tight">Media kutubxonasi (poydevor)</h1>
        <p className="text-sm text-muted">{data.note}</p>
      </header>

      <Card title="Arxitektura holati">
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
          <li>Fayllar hech qachon PostgreSQL’ga yozilmaydi — faqat metadata va URL (`media_assets` jadvali).</li>
          <li>Supabase Storage `media` bucket migratsiyada yaratilgan (public read, yozish faqat service-role).</li>
          <li>Yuklash UI’si va avtomatik metadata — Phase 4/5 (storage integratsiyasi bilan birga).</li>
          <li>Hozirgi galereya/yangilik rasmlari static fayllar sifatidagi xuddi shu URL konventsiyasida ishlaydi.</li>
        </ul>
      </Card>

      {data.items.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-muted">`media_assets` hozircha bo‘sh — yuklash pipeline Phase 4/5’da qo‘shiladi.</p>
        </Card>
      ) : (
        <Card title="Metadata">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
                  <th className="pb-2 pr-4 font-bold">Fayl</th>
                  <th className="pb-2 pr-4 font-bold">Turi</th>
                  <th className="pb-2 pr-4 font-bold">Hajm</th>
                  <th className="pb-2 pr-4 font-bold">O‘lcham</th>
                  <th className="pb-2 font-bold">URL</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold">{m.file_name}</td>
                    <td className="py-2.5 pr-4 text-muted">{m.mime_type ?? "—"}</td>
                    <td className="py-2.5 pr-4 tabular-nums">{fmtBytes(m.size_bytes)}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-muted">{m.width && m.height ? `${m.width}×${m.height}` : "—"}</td>
                    <td className="py-2.5">
                      <a href={m.public_url} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--accent-ink)] hover:underline">
                        ochish ↗
                      </a>
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
