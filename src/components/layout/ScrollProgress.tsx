"use client";

import { useEffect, useRef } from "react";

/**
 * Reading progress bar — 3px accent line at the very top.
 * Mutates a ref via rAF (no React re-renders); transform-only animation.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      el.style.transform = `scaleX(${p})`;
      el.style.opacity = p > 0.005 ? "1" : "0";
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-[3px]">
      <div
        ref={ref}
        className="h-full origin-left bg-gradient-to-r from-[color:var(--accent)] to-[#ffb066] opacity-0 transition-opacity duration-300"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
