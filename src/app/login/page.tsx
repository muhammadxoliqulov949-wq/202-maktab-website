import type { Metadata } from "next";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const metadata: Metadata = {
  title: "Kirish",
  description: "202-maktab sayti uchun Google orqali xavfsiz kirish.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-20 pt-36 sm:px-6 sm:pb-28 sm:pt-40">
      <div aria-hidden="true" className="absolute inset-x-0 top-8 -z-10 mx-auto h-72 max-w-2xl rounded-full bg-[color:var(--accent-soft)] blur-3xl opacity-70" />
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-surface/90 shadow-[var(--shadow-raised)] md:grid-cols-[1.02fr_.98fr]">
        <div className="bg-[color:var(--primary)] p-7 text-white sm:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/65">202-maktab</p>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Xush kelibsiz</h1>
          <p className="mt-4 max-w-md text-[0.98rem] leading-7 text-white/75">
            Google hisobingiz bilan xavfsiz kiring. Tasdiqlashdan keyin sessiyangiz brauzerda saqlanadi.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm font-semibold text-white/80">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/12">202</span>
            Bilim, tarbiya va kelajak bir maskanda
          </div>
        </div>

        <div className="p-7 sm:p-10">
          <p className="text-sm font-bold text-muted">Hisobga kirish</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink">Davom etish usulini tanlang</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Davom etish orqali Google hisobingizni 202-maktab bilan bog‘lashga rozilik bildirasiz.
          </p>

          <div className="mt-7">
            <GoogleSignInButton />
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-muted">
            Google tasdiqlashidan so‘ng siz bosh sahifaga qaytasiz.
          </p>
          <Link href="/" className="mt-7 inline-flex text-sm font-bold text-[color:var(--accent-ink)] underline underline-offset-4 hover:no-underline">
            ← Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    </section>
  );
}
