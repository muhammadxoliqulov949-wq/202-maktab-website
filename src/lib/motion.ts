"use client";

import { useEffect, useRef, useState } from "react";

/* ============================================================
   MOTION SYSTEM — small, dependency-free primitives.
   IntersectionObserver-based reveals; transform/opacity only.
   ============================================================ */

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/** Adds .is-in when the element enters the viewport (once). */
export function useInView<T extends HTMLElement>(threshold = 0.18, rootMargin = "0px 0px -8% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView } as const;
}

/** Count-up easing from 0 → target once `active` turns true. */
export function useCountUp(target: number, active: boolean, duration = 1900): number {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out quint — settles gently, no bounce
      const eased = 1 - Math.pow(1 - t, 5);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, reduced]);

  return value;
}

/** Subtle parallax translate for media (disabled for reduced motion / touch). */
export function useParallax<T extends HTMLElement>(strength = 0.08) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(hover: none)").matches;
    if (reduced || coarse || !("IntersectionObserver" in window)) return;

    let visible = false;
    let ticking = false;

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    });
    io.observe(el);

    function update() {
      if (!visible) {
        ticking = false;
        return;
      }
      const rect = el!.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh; // -0.5..0.5-ish
      const y = Math.max(-1, Math.min(1, progress)) * strength * 100;
      el!.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      requestAnimationFrame(update); // continue while visible
    }

    return () => {
      io.disconnect();
      el.style.transform = "";
    };
  }, [strength]);

  return ref;
}

/** Vertical progress of the page (0..1) — used sparingly. */
export function useScrollProgress(): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}
