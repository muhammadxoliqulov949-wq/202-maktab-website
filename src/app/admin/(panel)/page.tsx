"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, fmtDate } from "@/components/admin/client";
import { Card, ErrorNote, Loading, Pill, StatTile } from "@/components/admin/ui";

type Dashboard = {
  counts: {
    newsPublished: number;
    newsDraft: number;
    newsArchived: number;
    team: number;
    gallery: number;
    faqs: number;
    statistics: number;
    features: number;
    facilities: number;
    quickLinks: number;
    submissions: { new: number; in_progress: number; resolved: number; spam: number; total: number };
    media: number;
  };
  recentAudit: Array<{ id: string; action: string; entityType: string; entityId: string | null; adminIdentifier: string | null; createdAt: string }>;
  recentSubmissions: Array<{ id: string; name: string; topic: string; status: string; createdAt: string }>;
  generatedAt: string;
};

const ACTION_TONE: Record<string, "green" | "amber" | "gray" | "blue" | "red"> = {
  CREATE: "green",
  UPDATE: "blue",
  PUBLISH: "green",
  UNPUBLISH: "amber",
  ARCHIVE: "amber",
  DELETE: "red",
  STATUS_CHANGE: "blue",
  REORDER: "gray",
};

const STATUS_LABEL: Record<string, string> = { new: "Yangi", in_progress: "Jarayonda", resolved: "Yechilgan", spam: "Spam" };

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<Dashboard>("/api/v1/admin/dashboard")
      .then((b) => setData(b.data))
      .catch((e) => setError(e instanceof Error ? e.message : "Xato"));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;

  const c = data.counts;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Haqiqiy bazaga asoslangan ko‘rsatkichlar · {fmtDate(data.generatedAt)}</p>
        </div>
        <Link href="/admin/news/new" className="rounded-xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
          + Yangilik qo‘shish
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Yangi murojaat" value={c.submissions.new} tone={c.submissions.new > 0 ? "accent" : undefined} hint="inbox’dagi yangi" />
        <StatTile label="E’lon qilingan" value={c.newsPublished} hint="yangiliklar" />
        <StatTile label="Qoralama" value={c.newsDraft} tone={c.newsDraft > 0 ? "warn" : undefined} hint="yangiliklar" />
        <StatTile label="Jamoa" value={c.team} hint="visible+hidden" />
        <StatTile label="Galereya" value={c.gallery} hint="element" />
        <StatTile label="FAQ" value={c.faqs} hint="savol" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="So‘nggi harakatlar (audit)">
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-muted">Hozircha harakat yo‘q.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.recentAudit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Pill tone={ACTION_TONE[a.action] ?? "gray"}>{a.action}</Pill>
                  <span className="font-semibold">{a.entityType}</span>
                  {a.entityId ? <code className="rounded bg-muted/12 px-1.5 py-0.5 text-xs">{a.entityId.slice(0, 24)}</code> : null}
                  <span className="ml-auto text-xs text-muted">{fmtDate(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="So‘nggi murojaatlar"
          actions={
            <Link href="/admin/contact" className="text-sm font-bold text-[color:var(--accent-ink)] hover:underline">
              Barchasi →
            </Link>
          }
        >
          {data.recentSubmissions.length === 0 ? (
            <p className="text-sm text-muted">Hozircha murojaat yo‘q.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.recentSubmissions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-muted">· {s.topic}</span>
                  <Pill tone={s.status === "new" ? "blue" : s.status === "spam" ? "red" : "gray"}>{STATUS_LABEL[s.status] ?? s.status}</Pill>
                  <span className="ml-auto text-xs text-muted">{fmtDate(s.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Kontent holati">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 lg:grid-cols-7">
          {[
            ["Arxivlangan yangilik", c.newsArchived],
            ["Statistika", c.statistics],
            ["Imkoniyatlar", c.features],
            ["Inshootlar", c.facilities],
            ["Tez havolalar", c.quickLinks],
            ["Spam murojaat", c.submissions.spam],
            ["Media (metadata)", c.media],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-muted">{label}</dt>
              <dd className="font-display text-lg font-extrabold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
