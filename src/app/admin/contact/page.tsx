"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, fmtDate } from "@/components/admin/client";
import { Card, ConfirmButton, ErrorNote, Loading, Pill } from "@/components/admin/ui";

type Submission = {
  id: string;
  name: string;
  contact: string;
  topic: string;
  message: string;
  status: "new" | "in_progress" | "resolved" | "spam";
  source: string;
  createdAt: string;
  handledAt: string | null;
};

const LABEL: Record<Submission["status"], string> = { new: "Yangi", in_progress: "Jarayonda", resolved: "Yechilgan", spam: "Spam" };
const TONE: Record<Submission["status"], "blue" | "amber" | "gray" | "red" | "green"> = { new: "blue", in_progress: "amber", resolved: "green", spam: "red" };

export default function AdminContactPage() {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [status, setStatus] = useState<"" | Submission["status"]>("");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = new URLSearchParams({ limit: "100" });
      if (status) q.set("status", status);
      const body = await adminFetch<Submission[]>(`/api/v1/admin/contact-submissions?${q}`);
      setRows(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (s: Submission, next: Submission["status"]) => {
    try {
      await adminFetch(`/api/v1/admin/contact-submissions/${s.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  const remove = async (s: Submission) => {
    try {
      await adminFetch(`/api/v1/admin/contact-submissions/${s.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Murojaatlar</h1>
          <p className="text-sm text-muted">Maxfiy — bu ma’lumot hech qachon public API orqali berilmaydi</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
          <option value="">Barchasi</option>
          <option value="new">Yangi</option>
          <option value="in_progress">Jarayonda</option>
          <option value="resolved">Yechilgan</option>
          <option value="spam">Spam</option>
        </select>
      </header>

      <ErrorNote message={error} />

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-muted">Murojaat yo‘q.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((s) => (
            <Card key={s.id}>
              <button type="button" onClick={() => setOpenId(openId === s.id ? null : s.id)} className="flex w-full flex-wrap items-center gap-3 text-left">
                <Pill tone={TONE[s.status]}>{LABEL[s.status]}</Pill>
                <span className="font-bold">{s.name}</span>
                <span className="text-sm text-muted">{s.contact}</span>
                <span className="text-sm text-muted">· {s.topic}</span>
                <span className="ml-auto text-xs text-muted">{fmtDate(s.createdAt)}</span>
              </button>
              {openId === s.id ? (
                <div className="mt-4 border-t border-line pt-4">
                  <p className="whitespace-pre-wrap rounded-xl bg-muted/8 p-4 text-sm leading-relaxed">{s.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(["new", "in_progress", "resolved", "spam"] as const)
                      .filter((st) => st !== s.status)
                      .map((st) => (
                        <button key={st} type="button" onClick={() => change(s, st)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold hover:bg-muted/10">
                          → {LABEL[st]}
                        </button>
                      ))}
                    <span className="ml-auto">
                      <ConfirmButton onConfirm={() => remove(s)} message="Butunlay o‘chirilsinmi?" className="text-xs font-bold text-red-600 hover:underline">
                        O‘chirish
                      </ConfirmButton>
                    </span>
                  </div>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
