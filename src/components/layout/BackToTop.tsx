"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Floating back-to-top — appears after 700px; respects reduced motion. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShow(window.scrollY > 700);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Sahifa boshiga qaytish"
      title="Yuqoriga"
      className={`icon-btn fixed bottom-6 left-5 z-[85] h-12 w-12 transition-all duration-500 sm:left-7 ${
        show ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
      tabIndex={show ? 0 : -1}
    >
      <Icon name="arrow-up" size={19} />
    </button>
  );
}
