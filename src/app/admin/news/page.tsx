"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { adminFetch, fmtDateOnly } from "@/components/admin/client";
import { Card, ConfirmButton, ErrorNote, Loading, Pill } from "@/components/admin/ui";

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  isPublished: boolean;
  archivedAt: string | null;
  updatedAt: string;
};

const STATUS_TONE = { published: "green", draft: "amber", archived: "gray" } as const;

export default function AdminNewsPage() {
  const [rows, setRows] = useState<Article[] | null>(null);
  const [meta, setMeta] = useState<{ total: number; categories?: string[] }>({ total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft" | "archived">("all");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: "100", status });
      if (search.trim()) q.set("search", search.trim());
      if (category) q.set("category", category);
      const body = await adminFetch<Article[]>(`/api/v1/admin/news?${q}`);
      setRows(body.data);
      setMeta((m) => ({ ...m, total: Number(body.meta.total ?? body.data.length) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  }, [search, status, category]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    // categories once (from "all" list meta)
    adminFetch<Article[]>("/api/v1/admin/news?limit=1").then((b) => {
      const cats = (b.meta.categories as string[] | undefined) ?? [];
      if (cats.length) setMeta((m) => ({ ...m, categories: cats }));
    }).catch(() => {});
  }, []);

  const togglePublish = async (a: Article) => {
    try {
      await adminFetch(`/api/v1/admin/news/${a.id}`, { method: "PATCH", body: JSON.stringify({ isPublished: !a.isPublished }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  const archive = async (a: Article) => {
    try {
      await adminFetch(`/api/v1/admin/news/${a.id}`, { method: "DELETE" });
      setNotice("Arxivlandi — public sahifadan yashirildi");
      await load();
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  const hardDelete = async (a: Article) => {
    try {
      await adminFetch(`/api/v1/admin/news/${a.id}?hard=true`, { method: "DELETE" });
      setNotice("Butunlay o‘chirildi");
      await load();
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  const statusOf = (a: Article): keyof typeof STATUS_TONE => (a.archivedAt ? "archived" : a.isPublished ? "published" : "draft");
  const STATUS_LABEL = { published: "E’lon qilingan", draft: "Qoralama", archived: "Arxiv" };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Yangiliklar</h1>
          <p className="text-sm text-muted">Jami: {meta.total} · qoralamalar public API’da ko‘rinmaydi</p>
        </div>
        <Link href="/admin/news/new" className="rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
          + Yangilik qo‘shish
        </Link>
      </header>

      <ErrorNote message={error} />
      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{notice}</p>
      ) : null}

      <Card
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sarlavha / slug…" className="w-44 rounded-xl border border-line bg-background px-3 py-1.5 text-sm outline-none focus:border-[color:var(--accent)]" />
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-xl border border-line bg-background px-2.5 py-1.5 text-sm">
              <option value="all">Barcha holatlar</option>
              <option value="published">E’lon qilingan</option>
              <option value="draft">Qoralama</option>
              <option value="archived">Arxiv</option>
            </select>
            {meta.categories?.length ? (
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-line bg-background px-2.5 py-1.5 text-sm">
                <option value="">Barcha kategoriyalar</option>
                {meta.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        }
      >
        {!rows ? (
          <Loading />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Topilmadi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
                  <th className="pb-2 pr-4 font-bold">Sarlavha</th>
                  <th className="pb-2 pr-4 font-bold">Kategoriya</th>
                  <th className="pb-2 pr-4 font-bold">Sana</th>
                  <th className="pb-2 pr-4 font-bold">Holat</th>
                  <th className="pb-2 text-right font-bold">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const st = statusOf(a);
                  return (
                    <tr key={a.id} className="border-b border-line/60 last:border-0">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/news/${a.id}/edit`} className="font-bold hover:underline">
                          {a.title}
                        </Link>
                        <span className="block text-xs text-muted">/{a.slug}</span>
                      </td>
                      <td className="py-3 pr-4">{a.category}</td>
                      <td className="py-3 pr-4 tabular-nums text-muted">{fmtDateOnly(a.date)}</td>
                      <td className="py-3 pr-4">
                        <Pill tone={STATUS_TONE[st]}>{STATUS_LABEL[st]}</Pill>
                      </td>
                      <td className="py-3">
                        <span className="flex flex-wrap items-center justify-end gap-3 text-xs font-bold">
                          {a.archivedAt ? (
                            <ConfirmButton onConfirm={() => hardDelete(a)} message="Butunlay o‘chirilsinmi?" className="text-xs font-bold text-red-600 hover:underline">
                              Butunlay o‘chirish
                            </ConfirmButton>
                          ) : (
                            <>
                              <button type="button" onClick={() => togglePublish(a)} className={a.isPublished ? "text-amber-700 hover:underline dark:text-amber-300" : "text-emerald-700 hover:underline dark:text-emerald-300"}>
                                {a.isPublished ? "Yashirish" : "E’lon qilish"}
                              </button>
                              <Link href={`/admin/news/${a.id}/edit`} className="text-[color:var(--accent-ink)] hover:underline">
                                Tahrirlash
                              </Link>
                              {st !== "archived" ? (
                                <ConfirmButton onConfirm={() => archive(a)} message="Arxivlash (qaytariladi)" className="text-xs font-bold text-muted hover:underline">
                                  Arxivlash
                                </ConfirmButton>
                              ) : null}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
