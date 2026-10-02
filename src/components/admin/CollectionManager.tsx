"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { adminFetch } from "@/components/admin/client";
import { Card, ConfirmButton, ErrorNote, Field, Loading, Modal, Pill, Toggle, inputCls } from "@/components/admin/ui";

/**
 * Generic collection manager (team / gallery / faqs / facilities / features /
 * statistics / quick-links): searchable list, inline visibility toggle,
 * reorder, create/edit modal form, confirmed hard delete.
 * All data flows through /api/v1/admin/{entity}.
 */

export type FieldType = "text" | "textarea" | "number" | "boolean" | "select";

export type AdminField = {
  name: string;
  label: string;
  type: FieldType;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  span2?: boolean;
  defaultValue?: unknown;
};

export type AdminColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
  sub?: (row: Record<string, unknown>) => string | undefined;
};

export type EntityConfig = {
  entity: string;
  title: string;
  subtitle: string;
  createLabel: string;
  columns: AdminColumn[];
  fields: AdminField[];
  searchable: boolean;
  reorderable: boolean;
  hasVisibility: boolean;
  emptyText: string;
};

type Row = Record<string, unknown>;

export function CollectionManager({ config }: { config: EntityConfig }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "visible" | "hidden">("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: "200", status });
      if (search.trim()) q.set("search", search.trim());
      const body = await adminFetch<Row[]>(`/api/v1/admin/${config.entity}?${q}`);
      setRows(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  }, [config.entity, search, status]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    const defaults: Record<string, unknown> = {};
    for (const f of config.fields) defaults[f.name] = f.defaultValue ?? (f.type === "boolean" ? true : f.type === "number" ? 0 : "");
    setForm(defaults);
    setFormError(null);
    setCreating(true);
  };

  const openEdit = (row: Row) => {
    const values: Record<string, unknown> = {};
    for (const f of config.fields) values[f.name] = row[f.name] ?? (f.type === "boolean" ? false : "");
    setForm(values);
    setFormError(null);
    setEditing(row);
  };

  const save = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (creating) {
        await adminFetch(`/api/v1/admin/${config.entity}`, { method: "POST", body: JSON.stringify(payload) });
        setNotice("Yaratildi ✓");
      } else {
        await adminFetch(`/api/v1/admin/${config.entity}/${String(editing?.id)}`, { method: "PATCH", body: JSON.stringify(payload) });
        setNotice("Saqlandi ✓");
      }
      setCreating(false);
      setEditing(null);
      await load();
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Xato");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    try {
      await adminFetch(`/api/v1/admin/${config.entity}/${String(row.id)}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  const toggleVisible = async (row: Row, visible: boolean) => {
    try {
      await adminFetch(`/api/v1/admin/${config.entity}/${String(row.id)}`, { method: "PATCH", body: JSON.stringify({ isVisible: visible }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!rows) return;
    const ids = rows.map((r) => String(r.id));
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    try {
      await adminFetch(`/api/v1/admin/${config.entity}/order`, { method: "PUT", body: JSON.stringify({ ids }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  const formNode = useMemo(
    () => (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {config.fields.map((f) => (
          <div key={f.name} className={f.span2 || f.type === "textarea" ? "sm:col-span-2" : ""}>
            <Field label={f.label}>
              {f.type === "textarea" ? (
                <textarea rows={3} className={inputCls} value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
              ) : f.type === "boolean" ? (
                <Toggle checked={Boolean(form[f.name])} onChange={(v) => setForm({ ...form, [f.name]: v })} label={f.label} />
              ) : f.type === "select" ? (
                <select className={inputCls} value={String(form[f.name] ?? "")} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                  {(f.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  className={inputCls}
                  placeholder={f.placeholder}
                  value={String(form[f.name] ?? "")}
                  onChange={(e) => setForm({ ...form, [f.name]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                />
              )}
            </Field>
          </div>
        ))}
      </div>
    ),
    [config.fields, form]
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">{config.title}</h1>
          <p className="text-sm text-muted">{config.subtitle}</p>
        </div>
        <button type="button" onClick={openCreate} className="rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
          + {config.createLabel}
        </button>
      </header>

      <ErrorNote message={error} />
      {notice ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{notice}</p>
      ) : null}

      <Card
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {config.searchable ? (
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish…" className="w-44 rounded-xl border border-line bg-background px-3 py-1.5 text-sm outline-none focus:border-[color:var(--accent)]" />
            ) : null}
            {config.hasVisibility ? (
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-xl border border-line bg-background px-2.5 py-1.5 text-sm">
                <option value="all">Hammasi</option>
                <option value="visible">Ko‘rinadigan</option>
                <option value="hidden">Yashirilgan</option>
              </select>
            ) : null}
          </div>
        }
      >
        {!rows ? (
          <Loading />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{config.emptyText}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
                  {config.reorderable ? <th className="w-16 pb-2 font-bold">Tartib</th> : null}
                  {config.columns.map((c) => (
                    <th key={c.key} className="pb-2 pr-4 font-bold">
                      {c.label}
                    </th>
                  ))}
                  {config.hasVisibility ? <th className="pb-2 pr-4 font-bold">Ko‘rinadi</th> : null}
                  <th className="pb-2 text-right font-bold">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={String(row.id)} className="border-b border-line/60 align-top last:border-0">
                    {config.reorderable ? (
                      <td className="py-3 pr-2">
                        <span className="flex flex-col gap-0.5">
                          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yuqoriga" className="rounded border border-line px-1.5 text-xs leading-5 disabled:opacity-25">
                            ▲
                          </button>
                          <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Pastga" className="rounded border border-line px-1.5 text-xs leading-5 disabled:opacity-25">
                            ▼
                          </button>
                        </span>
                      </td>
                    ) : null}
                    {config.columns.map((c) => (
                      <td key={c.key} className="py-3 pr-4">
                        {c.render ? c.render(row) : <span>{String(row[c.key] ?? "—")}</span>}
                        {c.sub ? <span className="block text-xs text-muted">{c.sub(row)}</span> : null}
                      </td>
                    ))}
                    {config.hasVisibility ? (
                      <td className="py-3 pr-4">
                        <Toggle checked={Boolean(row.isVisible)} onChange={(v) => toggleVisible(row, v)} label="Ko‘rinadigan" />
                      </td>
                    ) : null}
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center gap-3">
                        <button type="button" onClick={() => openEdit(row)} className="font-bold text-[color:var(--accent-ink)] hover:underline">
                          Tahrirlash
                        </button>
                        <ConfirmButton onConfirm={() => remove(row)} message="Ishonchingiz komilmi?" className="text-xs font-bold text-red-600 hover:underline">
                          O‘chirish
                        </ConfirmButton>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating || editing ? (
        <Modal title={creating ? config.createLabel : `Tahrirlash — ${String(editing?.id)}`} onClose={() => { setCreating(false); setEditing(null); }} wide>
          <div className="flex flex-col gap-4">
            <ErrorNote message={formError} />
            {formNode}
            <div className="flex justify-end gap-3 border-t border-line pt-4">
              <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold hover:bg-muted/10">
                Bekor qilish
              </button>
              <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-[color:var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
                {saving ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function textPreview(v: unknown, max = 80): string {
  const s = String(v ?? "");
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function VisiblePill({ v }: { v: unknown }) {
  return v ? <Pill tone="green">Ko‘rinadi</Pill> : <Pill tone="gray">Yashirilgan</Pill>;
}
