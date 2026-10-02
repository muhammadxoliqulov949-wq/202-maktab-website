"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, fmtDate } from "@/components/admin/client";
import { Card, ErrorNote, Loading, Pill } from "@/components/admin/ui";

type AuditRow = {
  id: string;
  adminIdentifier: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

const TONE: Record<string, "green" | "amber" | "gray" | "blue" | "red"> = {
  CREATE: "green",
  UPDATE: "blue",
  PUBLISH: "green",
  UNPUBLISH: "amber",
  ARCHIVE: "amber",
  DELETE: "red",
  STATUS_CHANGE: "blue",
  REORDER: "gray",
};

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: "100" });
      if (action) q.set("action", action);
      if (entityType) q.set("entityType", entityType);
      const body = await adminFetch<AuditRow[]>(`/api/v1/admin/audit-log?${q}`);
      setRows(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  }, [action, entityType]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Audit jurnali</h1>
          <p className="text-sm text-muted">
            Har bir admin mutatsiyasi qayd etiladi. Phase 3’da identifikator — auth mexanizmi (dev-token yoki bo‘sh); Phase 4 real foydalanuvchi bog‘laydi.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={action} onChange={(e) => setAction(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
            <option value="">Barcha harakatlar</option>
            {["CREATE", "UPDATE", "DELETE", "ARCHIVE", "PUBLISH", "UNPUBLISH", "STATUS_CHANGE", "REORDER"].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
            <option value="">Barcha obyektlar</option>
            {["news", "team", "gallery", "faqs", "facilities", "features", "statistics", "quick-links", "site-settings", "contact-info", "contact-submission"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </header>

      <ErrorNote message={error} />

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-muted">Yozuv yo‘q.</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.7rem] uppercase tracking-wider text-muted">
                  <th className="pb-2 pr-4 font-bold">Harakat</th>
                  <th className="pb-2 pr-4 font-bold">Obyekt</th>
                  <th className="pb-2 pr-4 font-bold">ID</th>
                  <th className="pb-2 pr-4 font-bold">Kim</th>
                  <th className="pb-2 font-bold">Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-4">
                      <Pill tone={TONE[a.action] ?? "gray"}>{a.action}</Pill>
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">{a.entityType}</td>
                    <td className="py-2.5 pr-4">
                      <code className="rounded bg-muted/12 px-1.5 py-0.5 text-xs">{a.entityId ? a.entityId.slice(0, 28) : "—"}</code>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{a.adminIdentifier ?? "anon (dev)"}</td>
                    <td className="py-2.5 text-xs text-muted tabular-nums">{fmtDate(a.createdAt)}</td>
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
