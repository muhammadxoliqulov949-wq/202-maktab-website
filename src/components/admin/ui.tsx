"use client";

import { useState, type ReactNode } from "react";

/* Shared admin UI primitives — compact, table-first, no public-site styling reuse beyond tokens. */

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface shadow-sm">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-display text-[0.95rem] font-extrabold tracking-tight">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: "accent" | "warn" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold tabular-nums ${tone === "accent" ? "text-[color:var(--accent-ink)]" : tone === "warn" ? "text-amber-600" : ""}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Pill({ tone, children }: { tone: "green" | "amber" | "gray" | "blue" | "red"; children: ReactNode }) {
  const tones: Record<string, string> = {
    green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    gray: "bg-muted/10 text-muted",
    blue: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
    red: "bg-red-500/12 text-red-700 dark:text-red-300",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${tones[tone]}`}>{children}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-[0.9rem] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-[color:var(--accent)]" : "bg-line-strong/50"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
}

/** Destructive actions always require typed confirmation — never a single click. */
export function ConfirmButton({ onConfirm, children, message, className }: { onConfirm: () => void; children: ReactNode; message: string; className?: string }) {
  const [arming, setArming] = useState(false);
  if (!arming) {
    return (
      <button type="button" onClick={() => setArming(true)} className={className ?? "text-red-600 hover:underline"}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold">
      <span className="text-muted">{message}</span>
      <button
        type="button"
        onClick={() => {
          setArming(false);
          onConfirm();
        }}
        className="rounded-lg bg-red-600 px-2.5 py-1 font-bold text-white hover:bg-red-700"
      >
        Ha, o‘chirish
      </button>
      <button type="button" onClick={() => setArming(false)} className="rounded-lg border border-line px-2.5 py-1 hover:bg-muted/10">
        Bekor
      </button>
    </span>
  );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`mt-8 w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-2xl border border-line bg-surface shadow-2xl`}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="font-display font-extrabold tracking-tight">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Yopish" className="rounded-lg border border-line px-2.5 py-1 text-sm hover:bg-muted/10">
            ✕
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300">
      {message}
    </p>
  );
}

export function Loading() {
  return <p className="animate-pulse py-10 text-center text-sm font-semibold text-muted">Yuklanmoqda…</p>;
}
