"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Facility } from "@/data/facilities";

/**
 * Facilities storytelling core:
 * - steps auto-highlight via IntersectionObserver on the section (gentle, non-blocking)
 * - user can click any step (buttons, aria-selected)
 * - images crossfade; only transform/opacity animate
 */
export function FacilitiesStoryClient({ items }: { items: Facility[] }) {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const autoRef = useRef<boolean>(true);

  /* gentle auto-advance while the section is visible; stops forever after user interaction */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !autoRef.current) return;
        if (visible) {
          timer = setInterval(() => {
            setActive((a) => (a + 1) % items.length);
          }, 4200);
        } else if (timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, [items.length]);

  const select = (i: number) => {
    autoRef.current = false;
    setActive(i);
  };

  return (
    <div ref={sectionRef} className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
      {/* steps */}
      <div role="group" aria-label="Maktab inshootlari — bosqichni tanlash" className="flex flex-col gap-2.5">
        {items.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={active === i}
            aria-controls="fac-panel"
            onClick={() => select(i)}
            onFocus={() => select(i)}
            className={`fac-step ${active === i ? "active" : ""}`}
          >
            <span className="flex items-baseline justify-between gap-4">
              <span className="kicker !tracking-[0.14em]">{f.kicker}</span>
              {active === i ? <span className="badge-dot" aria-hidden="true" /> : null}
            </span>
            <span className="mt-1.5 block font-display text-[1.28rem] font-extrabold tracking-tight fac-step-title">
              {f.title}
            </span>
            <span
              className={`grid transition-[grid-template-rows,opacity] duration-500 ${
                active === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <span className="overflow-hidden">
                <span className="block pt-2 text-[0.92rem] leading-relaxed text-muted">{f.description}</span>
              </span>
            </span>
            <span className="fac-bar mt-4 block" aria-hidden="true">
              <i style={{ width: active === i ? "100%" : "0%" }} />
            </span>
          </button>
        ))}
      </div>

      {/* image stage */}
      <div className="img-frame relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[560px]" id="fac-panel" role="tabpanel" aria-labelledby={`fac-tab-${items[active].id}`}>
        {items.map((f, i) => (
          <div key={f.id} className={`fac-item ${active === i ? "active" : ""}`} aria-hidden={active !== i}>
            <Image
              src={f.image}
              alt={f.alt}
              fill
              sizes="(min-width: 1024px) 55vw, 92vw"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />
      </div>
    </div>
  );
}
