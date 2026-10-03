"use client";

import { useEffect } from "react";

/**
 * Motion3D — sayt bo'ylab "premium 3D" harakat qatlami (React'dan tashqarida,
 * DOM'ni bevosita boshqaradi — hech qanday qayta render yo'q):
 *
 *  1. Kursor nuri (spotlight): ekranda yumshoq yorug'lik kursorni kuzatadi.
 *  2. `data-tilt` elementlar: pointer ostida 3D egilish (rotateX/rotateY) +
 *     yorug'lik aksi (`--tilt-x/--tilt-y` CSS o'zgaruvchilari orqali).
 *  3. `data-parallax="0.15"` elementlar: scroll'da 3D chuqurlik siljishi.
 *
 * Faqat "hover: hover" + "pointer: fine" qurilmalarda va reduced-motion
 * o'chirilgan bo'lsa ishlaydi. Telefonda esa hech narsa ishlamaydi (tezlik).
 */
export function Motion3D() {
  const enabledRef = { current: false };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduced || !fine) return;

    const cleanupFns: Array<() => void> = [];

    /* ---------- 1) kursor nuri ---------- */
    const spot = document.createElement("div");
    spot.className = "cursor-spot";
    spot.setAttribute("aria-hidden", "true");
    document.body.appendChild(spot);
    cleanupFns.push(() => spot.remove());

    const spotState = { x: window.innerWidth / 2, y: window.innerHeight * 0.3, tx: window.innerWidth / 2, ty: window.innerHeight * 0.3 };
    const onMove = (e: PointerEvent) => {
      spotState.tx = e.clientX;
      spotState.ty = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    cleanupFns.push(() => window.removeEventListener("pointermove", onMove));

    /* ---------- 2) 3D egilish (tilt) ---------- */
    const tiltTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]"));
    tiltTargets.forEach((el) => {
      el.classList.add("tilt-ready");
      const state = { rx: 0, ry: 0, tz: 0, trx: 0, try_: 0, ttz: 0, raf: 0 };

      const apply = () => {
        state.rx += (state.trx - state.rx) * 0.16;
        state.ry += (state.try_ - state.ry) * 0.16;
        state.tz += (state.ttz - state.tz) * 0.16;
        el.style.setProperty("--tilt-x", `${state.rx.toFixed(3)}deg`);
        el.style.setProperty("--tilt-y", `${state.ry.toFixed(3)}deg`);
        el.style.setProperty("--tilt-z", `${state.tz.toFixed(2)}px`);
        const settled =
          Math.abs(state.trx - state.rx) < 0.01 &&
          Math.abs(state.try_ - state.ry) < 0.01 &&
          Math.abs(state.ttz - state.tz) < 0.05;
        if (settled && state.trx === 0 && state.try_ === 0) {
          state.raf = 0;
          return;
        }
        state.raf = requestAnimationFrame(apply);
      };
      const kick = () => {
        if (!state.raf) state.raf = requestAnimationFrame(apply);
      };

      const onPointerEnter = () => {
        state.ttz = 14;
        kick();
      };
      const onPointerMove = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / Math.max(1, rect.width);
        const py = (e.clientY - rect.top) / Math.max(1, rect.height);
        el.style.setProperty("--tilt-px", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--tilt-py", `${(py * 100).toFixed(1)}%`);
        const max = Number(el.dataset.tiltStrength ?? 7);
        state.try_ = (px - 0.5) * 2 * max;
        state.trx = -(py - 0.5) * 2 * max;
        kick();
      };
      const onPointerLeave = () => {
        state.trx = 0;
        state.try_ = 0;
        state.ttz = 0;
        kick();
      };

      el.addEventListener("pointerenter", onPointerEnter);
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerleave", onPointerLeave);
      cleanupFns.push(() => {
        el.removeEventListener("pointerenter", onPointerEnter);
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerleave", onPointerLeave);
        el.classList.remove("tilt-ready");
        if (state.raf) cancelAnimationFrame(state.raf);
      });
    });

    /* ---------- 3) scroll parallaksi ---------- */
    const parallaxTargets = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let ticking = false;
    const updateParallax = () => {
      const vh = window.innerHeight || 1;
      parallaxTargets.forEach((el) => {
        const factor = Number(el.dataset.parallax ?? 0.12);
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const p = (center - vh / 2) / vh; // -1 … 1 atrofida
        el.style.setProperty("--parallax-y", `${(p * factor * -100).toFixed(2)}px`);
      });
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateParallax);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    cleanupFns.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    });
    updateParallax();

    /* ---------- umumiy rAF: kursor nuri ---------- */
    let spotlightRaf = 0;
    const loop = () => {
      spotState.x += (spotState.tx - spotState.x) * 0.09;
      spotState.y += (spotState.ty - spotState.y) * 0.09;
      spot.style.transform = `translate3d(${spotState.x.toFixed(1)}px, ${spotState.y.toFixed(1)}px, 0)`;
      spotlightRaf = requestAnimationFrame(loop);
    };
    loop();
    cleanupFns.push(() => cancelAnimationFrame(spotlightRaf));
    enabledRef.current = true;

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return null;
}
