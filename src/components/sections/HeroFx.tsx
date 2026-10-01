"use client";

import { useEffect } from "react";

/**
 * Cinematic hero scroll-out: media drifts+scales, content lifts and fades,
 * scroll cue dissolves — pure transform/opacity via rAF (no re-renders).
 * Starts only after the intro sequence finishes (~2.3s) so entrance and
 * scroll effects never fight over the same properties.
 */
export function HeroFx() {
  useEffect(() => {
    const media = document.querySelector<HTMLElement>("[data-hero-media]");
    const content = document.querySelector<HTMLElement>("[data-hero-content]");
    const cue = document.querySelector<HTMLElement>("[data-hero-cue]");
    if (!media || !content) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      media.classList.remove("anim-hero-media");
      return;
    }

    let ready = false;
    const t = setTimeout(() => {
      media.classList.remove("anim-hero-media"); // release transform from fill-mode
      ready = true;
    }, 2300);

    let ticking = false;
    const onScroll = () => {
      if (!ready || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const vh = window.innerHeight || 1;
        const p = Math.min(1.15, Math.max(0, window.scrollY / vh));
        media.style.transform = `translate3d(0, ${(p * 14).toFixed(2)}%, 0) scale(${(1 + p * 0.06).toFixed(3)})`;
        content.style.transform = `translate3d(0, ${(-p * 56).toFixed(1)}px, 0)`;
        content.style.opacity = String(Math.max(0, 1 - p * 1.05));
        if (cue) cue.style.opacity = String(Math.max(0, 1 - p * 2.4));
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
