"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Facility } from "@/data/facilities";

/**
 * Scroll-driven facilities story:
 * - the image stage sticks in the viewport while the step list scrolls;
 * - IntersectionObserver marks the step in the reading zone as active
 *   (native scrolling — zero hijack);
 * - clicking a step smooth-scrolls it into the reading zone (user-initiated);
 * - step heights are stable (no expand/collapse) so scrolling never jumps.
 */
export function FacilitiesStoryClient({ items }: { items: Facility[] }) {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Desktopda: scroll hikoyani boshqaradi (IO). Telefonda: foydalanuvchi
  // bosqichni bosadi (gorizontal karusel) — IO o'chiriladi, aks holda u
  // tasodifiy bosqichni "faol" qilib qo'yardi.
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    let io: IntersectionObserver | null = null;

    const attach = () => {
      const els = stepRefs.current.filter(Boolean) as HTMLElement[];
      io?.disconnect();
      io = null;
      if (!mq.matches || els.length === 0) return;
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              setActive(Number((e.target as HTMLElement).dataset.index ?? 0));
            }
          }
        },
        { rootMargin: "-42% 0px -48% 0px", threshold: 0 }
      );
      els.forEach((el) => io?.observe(el));
    };

    attach();
    mq.addEventListener("change", attach);
    return () => {
      mq.removeEventListener("change", attach);
      io?.disconnect();
    };
  }, [items.length]);

  return (
    <div className="fac-story lg:grid lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
      {/* image stage — sticks while the story scrolls (desktop); compact panel on mobile */}
      <div className="img-frame relative mb-6 h-[48vw] max-h-[320px] overflow-hidden lg:col-start-2 lg:row-start-1 lg:mb-0 lg:sticky lg:top-28 lg:h-auto lg:min-h-[560px]">
        {items.map((f, i) => (
          <div key={f.id} className={`fac-item ${active === i ? "active" : ""}`} aria-hidden={active !== i}>
            <Image
              src={f.image}
              alt={f.alt}
              fill
              sizes="(min-width: 1024px) 48vw, 94vw"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />
      </div>

      {/* steps — scroll drives the story */}
      <div role="group" aria-label="Maktab inshootlari — bosqichlar" className="fac-steps flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
        {items.map((f, i) => (
          <button
            key={f.id}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            type="button"
            data-index={i}
            aria-pressed={active === i}
            onClick={() => {
              setActive(i);
              if (window.matchMedia("(min-width: 1024px)").matches) {
                stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
              } else {
                stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
              }
            }}
            className={`fac-step ${active === i ? "active" : ""}`}
          >
            <span className="flex items-center justify-between gap-4">
              <span className="kicker !tracking-[0.14em]">{f.kicker}</span>
              {active === i ? <span className="badge-dot" aria-hidden="true" /> : null}
            </span>
            <span className="fac-step-title mt-1.5 block font-display text-[1.28rem] font-extrabold tracking-tight">
              {f.title}
            </span>
            <span className="fac-desc mt-2 block text-[0.92rem] leading-relaxed text-muted">{f.description}</span>
            <span className="fac-bar mt-4 block" aria-hidden="true">
              <i style={{ width: active === i ? "100%" : "0%" }} />
            </span>
          </button>
        ))}
      </div>

      {/* telefon: faol bosqich tavsifi (bitta ekranda qoladi) */}
      <p className="fac-mobile-desc lg:hidden" aria-live="polite">
        {items[active]?.description}
      </p>
    </div>
  );
}
