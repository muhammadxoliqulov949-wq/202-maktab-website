"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SmartVideo } from "@/components/media/SmartVideo";

/**
 * AmbientBackdrop — sahifa orqasidagi "jonli" fon.
 *
 * * Bitta tekis rang emas: maktab hayotidan olingan xiralashtirilgan
 *   rasm/video qatlamlari navbat bilan ko'rinadi (cross-fade).
 * * Slayd sahifa scroll qilinishiga qarab almashadi (har ~0.72 ekran).
 * * Telefonda ham yengil: video faqat kerak bo'lganda (SmartVideo orqali)
 *   yuklanadi; `prefers-reduced-motion` bo'lsa — bitta statik rasm.
 * * `pointer-events: none`, `aria-hidden` — kontent va a11y'ga ta'sir qilmaydi;
 *   admin panelda butunlay o'chiriladi.
 */

type Slide =
  | { kind: "image"; src: string; alt: string }
  | { kind: "video"; src: string; poster: string; label: string };

const SLIDES: Slide[] = [
  { kind: "image", src: "/images/intro.jpg", alt: "" },
  { kind: "image", src: "/images/edu-quality.jpg", alt: "" },
  { kind: "video", src: "/video/campus.mp4", poster: "/images/hero.jpg", label: "Maktab binosi va hovlisi" },
  { kind: "image", src: "/images/edu-library.jpg", alt: "" },
  { kind: "image", src: "/images/life-sport.jpg", alt: "" },
  { kind: "image", src: "/images/edu-events.jpg", alt: "" },
  { kind: "image", src: "/images/life-muhit.jpg", alt: "" },
];

/** Har bir slayd uchun scroll oralig'i (ekran balandligiga nisbatan). */
const STEP_RATIO = 0.72;

export function AmbientBackdrop() {
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [animated, setAnimated] = useState(true);
  const rafId = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimated(false);
      return;
    }

    let ticking = false;
    const compute = () => {
      const step = Math.max(360, window.innerHeight * STEP_RATIO);
      setIndex(Math.abs(Math.floor(window.scrollY / step)) % SLIDES.length);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId.current = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* admin panel — ish quroli; fon rasmi kerak emas (va tezlikni tejaydi) */
  if (pathname?.startsWith("/admin")) return null;

  const active = animated ? index : 0;
  /* video kadr almashinuvida uzilib qolmasin: qo'shni slaydlarda ham tayyor turadi */
  const isNear = (i: number) => {
    const d = Math.abs(i - active);
    return d <= 1 || d === SLIDES.length - 1;
  };

  return (
    <div className="ambient" aria-hidden="true">
      {SLIDES.map((slide, i) =>
        slide.kind === "image" ? (
          <div key={slide.src} className={`ambient-media${i === active ? " is-on" : ""}`}>
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="100vw"
              quality={55}
              priority={i === 0}
              aria-hidden="true"
              className="object-cover"
            />
          </div>
        ) : (
          <div key={slide.src} className={`ambient-media${i === active ? " is-on" : ""}`}>
            {/* video aktiv slayd atrofida yuklanadi — trafik va CPU tejaladi */}
            {isNear(i) ? <SmartVideo src={slide.src} poster={slide.poster} className="h-full w-full" label={slide.label} /> : null}
          </div>
        )
      )}
      <div className="ambient-veil" />
      <div className="ambient-grain" />
    </div>
  );
}
