"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * AmbientBackdrop — sahifa orqasidagi "jonli" maktab foni.
 *
 * Har bir bo'lim o'z rasmini e'lon qiladi: `<section data-ambient="/images/x.jpg">`.
 * Foydalanuvchi scroll qilganda ekran markazidagi bo'lim aniqlanadi va fon
 * o'sha bo'lim rasmiga **animatsiya bilan** (cross-fade + kichik zoom) o'tadi.
 * Bo'limlar orasida esa yumshoq blur parda matn o'qilishini kafolatlaydi.
 *
 * * `data-ambient` bo'lmasa — HERO rasmi ishlatiladi.
 * * Telefon/planshet, `prefers-reduced-motion`, Save-Data: statik (animatsiyasiz)
 *   bitta rasm; admin panelda fon umuman ko'rsatilmaydi.
 */

const FALLBACK_SRC = "/images/hero.jpg";
const MAX_LAYERS = 2;

type Layer = { id: number; src: string };

export function AmbientBackdrop() {
  const pathname = usePathname();
  const layerId = useRef(0);
  const [layers, setLayers] = useState<Layer[]>([{ id: -1, src: FALLBACK_SRC }]);
  const [animated, setAnimated] = useState(true);

  const push = useCallback((src: string) => {
    setLayers((prev) => {
      if (prev[prev.length - 1]?.src === src) return prev;
      const next = [...prev, { id: layerId.current++, src }];
      return next.slice(-MAX_LAYERS);
    });
  }, []);

  /* --- sozlamalar (bir marta) --- */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setAnimated(!reduced);
  }, []);

  /* --- bo'lim rasmlarini kuzatish --- */
  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;

    let raf = 0;
    const pick = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-ambient]"));
      if (!sections.length) {
        push(FALLBACK_SRC);
        return;
      }
      const probe = window.innerHeight * 0.42; // ekranning yuqori-uchdan bir qismi
      let best: HTMLElement | null = null;
      for (const el of sections) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= probe && rect.bottom >= probe) {
          best = best ? (rect.top > best.getBoundingClientRect().top ? el : best) : el;
        }
      }
      const src = best?.dataset.ambient || sections[0]?.dataset.ambient || FALLBACK_SRC;
      push(src);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(pick);
    };

    pick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname, push]);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <div className="ambient" aria-hidden="true">
      {layers.map((layer, i) => {
        const isNewest = i === layers.length - 1;
        const cls = ["ambient-media", "is-on", isNewest ? "is-entering" : "is-rest", !animated ? "is-static" : ""]
          .filter(Boolean)
          .join(" ");
        return (
        <div key={layer.id} className={cls}>
          <Image
            src={layer.src}
            alt=""
            fill
            sizes="100vw"
            quality={52}
            priority={i === 0}
            aria-hidden="true"
            className="object-cover"
          />
        </div>
        );
      })}
      <div className="ambient-veil" />
      <div className="ambient-grain" />
    </div>
  );
}
