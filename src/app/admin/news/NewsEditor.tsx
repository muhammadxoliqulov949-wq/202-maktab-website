"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminFetch } from "@/components/admin/client";
import { Card, ErrorNote, Field, Toggle, inputCls } from "@/components/admin/ui";

type Block = { type: "p" | "h" | "quote"; text?: string };

export type ArticleData = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string | null;
  readingTime: string;
  coverImage: string;
  coverAlt: string;
  content: Block[];
  isPublished: boolean;
  publishedAt: string | null;
  date?: string;
};

export function NewsEditor({ mode }: { mode: "new" | "edit" }) {
  const router = useRouter();
  const id = mode === "edit" ? window.location.pathname.split("/")[3] : undefined;
  const [data, setData] = useState<ArticleData | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const slugAuto = useRef(true);

  useEffect(() => {
    if (mode === "new") {
      setData({ slug: "", title: "", excerpt: "", category: "Yangiliklar", author: "", readingTime: "", coverImage: "", coverAlt: "", content: [], isPublished: false, publishedAt: null });
    } else {
      adminFetch<Record<string, unknown>>(`/api/v1/admin/news/${id}`)
        .then((b) => {
          const d = b.data as Record<string, unknown>;
          setData({
            id: String(d.id),
            slug: String(d.slug),
            title: String(d.title),
            excerpt: String(d.excerpt ?? ""),
            category: String(d.category ?? "Yangiliklar"),
            author: (d.author as string | null) ?? "",
            readingTime: String(d.readingTime ?? ""),
            coverImage: String(d.image ?? ""),
            coverAlt: String(d.alt ?? ""),
            content: (d.body as Block[]) ?? [],
            isPublished: Boolean(d.isPublished),
            publishedAt: (d.publishedAt as string | null) ?? null,
            date: String(d.date ?? ""),
          });
          setSlugTouched(true);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Xato"));
    }
    adminFetch<Record<string, unknown>[]>("/api/v1/admin/news?limit=1")
      .then((b) => setCategories(((b.meta.categories as string[] | undefined) ?? []).length ? (b.meta.categories as string[]) : ["Yangiliklar"]))
      .catch(() => setCategories(["Yangiliklar"]));
  }, [mode, id]);

  const autoSlug = useMemo(() => {
    return (title: string) =>
      title
        .toLowerCase()
        .replace(/[ʻʼ‘’'"'`]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100);
  }, []);

  if (error && !data) return <ErrorNote message={error} />;
  if (!data) return <p className="animate-pulse py-10 text-center text-sm font-semibold text-muted">Yuklanmoqda…</p>;

  const set = (patch: Partial<ArticleData>) => setData({ ...data, ...patch });

  const setTitle = (title: string) => {
    const patch: Partial<ArticleData> = { title };
    if (!slugTouched) patch.slug = autoSlug(title);
    set(patch);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: data.title,
        slug: data.slug || autoSlug(data.title),
        excerpt: data.excerpt,
        category: data.category,
        author: data.author || null,
        readingTime: data.readingTime || null,
        coverImage: data.coverImage || null,
        coverAlt: data.coverAlt || null,
        content: data.content,
        isPublished: data.isPublished,
        publishedAt: data.publishedAt ?? (data.isPublished ? new Date().toISOString() : null),
      };
      if (mode === "new") {
        const b = await adminFetch<{ id: string; slug: string }>("/api/v1/admin/news", { method: "POST", body: JSON.stringify(payload) });
        router.push(`/admin/news/${b.data.id}/edit`);
      } else {
        await adminFetch(`/api/v1/admin/news/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setError(null);
        router.refresh();
        window.alert("Saqlandi ✓");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setSaving(false);
    }
  };

  const setBlock = (i: number, patch: Partial<Block>) => {
    const content = data.content.map((b, j) => (j === i ? { ...b, ...patch } : b));
    set({ content });
  };

  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= data.content.length) return;
    const content = [...data.content];
    [content[i], content[j]] = [content[j], content[i]];
    set({ content });
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black tracking-tight">{mode === "new" ? "Yangi yangilik" : "Yangilikni tahrirlash"}</h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-sm font-bold">
            <Toggle checked={data.isPublished} onChange={(v) => set({ isPublished: v })} label="E’lon qilingan" />
            {data.isPublished ? "E’lon qilingan" : "Qoralama"}
          </span>
          <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </header>

      <ErrorNote message={error} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="Asosiy">
            <div className="flex flex-col gap-4">
              <Field label="Sarlavha">
                <input className={inputCls} value={data.title} onChange={(e) => setTitle(e.target.value)} placeholder="Yangilik sarlavhasi" />
              </Field>
              <Field label="Slug (URL)" hint="Sarlavhadan avtomatik; qo‘lda o‘zgartirish mumkin. Band bo‘lsa server 409 qaytaradi.">
                <input
                  className={inputCls}
                  value={data.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    slugAuto.current = false;
                    set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
                  }}
                  placeholder="masalan: yangi-oquv-yili"
                />
              </Field>
              <Field label="Qisqa mazmun (excerpt)">
                <textarea rows={3} className={inputCls} value={data.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card
            title="Matn bloklari"
            actions={
              <span className="flex gap-2">
                {(["p", "h", "quote"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set({ content: [...data.content, { type: t, text: "" }] })}
                    className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold hover:bg-muted/10"
                  >
                    + {t === "p" ? "Paragraf" : t === "h" ? "Sarlavha" : "Iqtibos"}
                  </button>
                ))}
              </span>
            }
          >
            {data.content.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Bloklar yo‘q — yuqoridagi tugmalar bilan qo‘shing.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.content.map((b, i) => (
                  <li key={i} className="rounded-xl border border-line p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <select value={b.type} onChange={(e) => setBlock(i, { type: e.target.value as Block["type"] })} className="rounded-lg border border-line bg-background px-2 py-1 text-xs font-bold">
                        <option value="p">Paragraf</option>
                        <option value="h">Sarlavha</option>
                        <option value="quote">Iqtibos</option>
                      </select>
                      <span className="ml-auto flex gap-1">
                        <button type="button" onClick={() => moveBlock(i, -1)} aria-label="Yuqoriga" className="rounded border border-line px-1.5 text-xs leading-5">▲</button>
                        <button type="button" onClick={() => moveBlock(i, 1)} aria-label="Pastga" className="rounded border border-line px-1.5 text-xs leading-5">▼</button>
                        <button type="button" onClick={() => set({ content: data.content.filter((_, j) => j !== i) })} aria-label="O‘chirish" className="rounded border border-red-500/40 px-1.5 text-xs leading-5 text-red-600">✕</button>
                      </span>
                    </div>
                    {b.type === "h" ? (
                      <input className={`${inputCls} font-display font-extrabold`} value={b.text ?? ""} onChange={(e) => setBlock(i, { text: e.target.value })} placeholder="Bo‘lim sarlavhasi" />
                    ) : b.type === "quote" ? (
                      <textarea rows={2} className={`${inputCls} italic`} value={b.text ?? ""} onChange={(e) => setBlock(i, { text: e.target.value })} placeholder="Iqtibos matni" />
                    ) : (
                      <textarea rows={3} className={inputCls} value={b.text ?? ""} onChange={(e) => setBlock(i, { text: e.target.value })} placeholder="Matn…" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Xususiyatlar">
            <div className="flex flex-col gap-4">
              <Field label="Kategoriya">
                <select className={inputCls} value={data.category} onChange={(e) => set({ category: e.target.value })}>
                  {(categories.length ? categories : [data.category]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Muallif">
                <input className={inputCls} value={data.author ?? ""} onChange={(e) => set({ author: e.target.value })} />
              </Field>
              <Field label="O‘qish vaqti">
                <input className={inputCls} value={data.readingTime} onChange={(e) => set({ readingTime: e.target.value })} placeholder="3 daqiqa" />
              </Field>
              <Field label="E’lon sanasi" hint={data.date ? `Hozirgi: ${data.date}` : undefined}>
                <input
                  type="date"
                  className={inputCls}
                  value={data.publishedAt ? data.publishedAt.slice(0, 10) : ""}
                  onChange={(e) => set({ publishedAt: e.target.value ? new Date(`${e.target.value}T06:00:00`).toISOString() : null })}
                />
              </Field>
            </div>
          </Card>

          <Card title="Muqova rasmi">
            <div className="flex flex-col gap-3">
              {data.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.coverImage} alt="" className="h-36 w-full rounded-xl border border-line object-cover" />
              ) : (
                <div className="grid h-36 place-items-center rounded-xl border border-dashed border-line text-xs text-muted">Rasm tanlanmagan</div>
              )}
              <Field label="Rasm URL">
                <input className={inputCls} value={data.coverImage} onChange={(e) => set({ coverImage: e.target.value })} placeholder="/images/… yoki https://…" />
              </Field>
              <Field label="Alt matn">
                <input className={inputCls} value={data.coverAlt} onChange={(e) => set({ coverAlt: e.target.value })} />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
