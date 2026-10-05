"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const QUICK_LINKS = [
  { href: "/ai-yordamchi", icon: "atom" as const, label: "Bugungi o‘quv rejasini boshlash", detail: "Ziyo bilan 3 qadam" },
  { href: "/education", icon: "graduation" as const, label: "Ta’lim yo‘nalishlarini ko‘rish", detail: "Fanlar va bosqichlar" },
  { href: "/contact#form", icon: "chat" as const, label: "Maktabga savol yuborish", detail: "Biz bilan bog‘laning" },
];

/** Persistent, low-pressure way for students to find Ziyo's study guidance. */
export function AiCompanion() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <div ref={wrapRef} className="ai-companion fixed bottom-5 right-4 z-[90] sm:bottom-7 sm:right-7">
      {open ? (
        <section id="ziyo-ai-companion" className="ai-companion-panel" role="dialog" aria-label="Ziyo AI yo‘ldoshi">
          <div className="flex items-start gap-3">
            <div className="ai-companion-panel-avatar relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl">
              <Image src="/images/ai-mentor-owl.webp" alt="" fill sizes="48px" className="object-cover object-center" />
            </div>
            <div className="min-w-0 pr-6">
              <p className="text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[color:var(--ai-cyan-deep)]">Ziyo · AI yo‘ldoshi</p>
              <h2 className="mt-1 font-display text-[1.02rem] font-extrabold tracking-tight text-ink">Qaysi qadamdan boshlaymiz?</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-xl text-muted transition-colors hover:bg-muted/10 hover:text-ink"
              aria-label="Ziyo oynasini yopish"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <p className="mt-4 text-[0.86rem] leading-relaxed text-muted">
            Men sizni kerakli yo‘nalishga olib boraman va bugungi o‘qish uchun kichik, aniq reja tuzishga yordam beraman.
          </p>
          <nav className="mt-4 grid gap-2" aria-label="Ziyo tezkor yo‘nalishlari">
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="ai-companion-link">
                <span className="ai-companion-link-icon">
                  <Icon name={link.icon} size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.83rem] font-extrabold leading-snug text-ink">{link.label}</span>
                  <span className="mt-0.5 block text-[0.72rem] font-semibold text-faint">{link.detail}</span>
                </span>
                <Icon name="arrow-up-right" size={15} className="ml-auto shrink-0 text-[color:var(--ai-cyan-deep)]" />
              </Link>
            ))}
          </nav>
        </section>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`ai-companion-trigger ${open ? "is-open" : ""}`}
        aria-expanded={open}
        aria-controls={open ? "ziyo-ai-companion" : undefined}
        aria-label={open ? "Ziyo yordamchisini yopish" : "Ziyo AI yordamchisini ochish"}
      >
        <span className="ai-companion-avatar relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl">
          <Image src="/images/ai-mentor-owl.webp" alt="" fill sizes="48px" className="object-cover object-center" />
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block text-[0.82rem] font-extrabold leading-none">Ziyo</span>
          <span className="mt-1 block text-[0.67rem] font-semibold leading-none opacity-70">AI yo‘ldoshi</span>
        </span>
        <Icon name={open ? "close" : "chat"} size={17} className="hidden shrink-0 sm:block" />
      </button>
    </div>
  );
}
