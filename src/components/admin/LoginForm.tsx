"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type FormEvent } from "react";

/**
 * Admin login form (Phase 4).
 *
 * Posts to the same-origin `/api/v1/auth/login`; the server verifies the
 * credentials with Supabase Auth and answers with an HttpOnly session cookie.
 * No token, e-mail list or technical error text ever reaches this component —
 * the server returns one generic message for every failure.
 */

type Errors = { email?: string; password?: string; form?: string };

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  function validate(): Errors {
    const e: Errors = {};
    const value = email.trim();
    if (!value) e.email = "Email kiriting";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) e.email = "Email formati noto‘g‘ri";
    if (!password) e.password = "Parol kiriting";
    else if (password.length > 200) e.password = "Parol juda uzun";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (e.email || e.password) return;

    setBusy(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => null);

      if (res.ok && body?.success) {
        setPassword("");
        router.replace(next);
        router.refresh();
        return;
      }

      // The server message is already generic and safe to show.
      setErrors({ form: body?.error?.message ?? "Login failed. Please check your email and password." });
    } catch {
      setErrors({ form: "Serverga ulanib bo‘lmadi. Qayta urinib ko‘ring." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-background px-4 py-10 text-ink">
      {/* ambient wash, consistent with the public site */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-[-10%] h-[420px] w-[420px] rounded-full bg-[color:var(--accent)]/12 blur-[120px]" />
        <div className="absolute -right-24 bottom-[-15%] h-[380px] w-[380px] rounded-full bg-[color:var(--accent)]/8 blur-[130px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--accent)] font-display text-sm font-black text-white">202</span>
          <div>
            <p className="font-display text-base font-extrabold leading-tight">202-maktab</p>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">Admin panel</p>
          </div>
        </div>

        <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-line bg-surface p-6 shadow-xl sm:p-8">
          <h1 className="font-display text-2xl font-extrabold">Kirish</h1>
          <p className="mt-1 text-sm text-muted">Administrator hisobingiz bilan tizimga kiring.</p>

          {errors.form ? (
            <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400">
              {errors.form}
            </p>
          ) : null}

          <div className="mt-5">
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
              placeholder="admin@202-maktab.uz"
            />
            {errors.email ? (
              <p id="email-error" className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
              Parol
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                className="w-full rounded-xl border border-line bg-background px-3.5 py-2.5 pr-20 text-sm outline-none transition-colors focus:border-[color:var(--accent)]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-2 my-1.5 rounded-lg px-2.5 text-xs font-bold text-muted hover:bg-muted/10"
              >
                {showPassword ? "Yashirish" : "Ko‘rsatish"}
              </button>
            </div>
            {errors.password ? (
              <p id="password-error" className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                {errors.password}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[color:var(--accent)] px-4 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Tekshirilmoqda…
              </span>
            ) : (
              "Kirish"
            )}
          </button>

          <p className="mt-4 text-center text-[0.72rem] leading-relaxed text-muted">
            Hisobingiz yo‘qmi yoki kirishda muammo bormi? Maktab administratoriga murojaat qiling.
          </p>
        </form>

        <div className="mt-5 text-center">
          <Link href="/" className="text-xs font-semibold text-muted hover:text-ink">
            ← Saytga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
