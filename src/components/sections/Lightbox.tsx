"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";
import type { GalleryItem } from "@/data/gallery";

type LightboxProps = {
  item: GalleryItem;
  items: GalleryItem[];
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (i: number) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
};

/**
 * Accessible lightbox: role=dialog + aria-modal, focus is trapped inside,
 * arrow keys navigate, Escape closes, thumbnails for direct access,
 * swipe support on touch devices.
 */
export function Lightbox({ item, items, index, total, onClose, onPrev, onNext, onSelect, onTouchStart, onTouchEnd }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const focusables = () => {
      const el = document.getElementById("lightbox-root");
      if (!el) return [];
      return Array.from(el.querySelectorAll<HTMLElement>("button, [href], video")).filter(
        (n) => n.offsetParent !== null || n.tagName === "VIDEO"
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item]);

  return (
    <div id="lightbox-root" className="lb" role="dialog" aria-modal="true" aria-label={`${item.alt} — ${index + 1}/${total}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* top bar */}
      <div className="flex items-center justify-between gap-4 p-4 sm:px-7">
        <span className="lb-count">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-[0.85rem] font-semibold text-white/70 sm:block">{item.category}</span>
          <button ref={closeRef} type="button" className="lb-btn" onClick={onClose} aria-label="Yopish (Esc)">
            <Icon name="close" size={20} />
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="lb-stage">
        <button type="button" className="lb-btn absolute left-3 top-1/2 z-10 -translate-y-1/2 sm:left-6" onClick={onPrev} aria-label="Oldingi (chapga strelka)">
          <Icon name="arrow-left" size={20} />
        </button>

        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={item.id} src={item.src} alt={item.alt} className="max-h-full max-w-full rounded-[18px] object-contain shadow-2xl" />
        ) : (
          <video key={item.id} src={item.src} poster={item.poster} controls autoPlay playsInline className="max-h-full max-w-full" aria-label={item.alt} />
        )}

        <button type="button" className="lb-btn absolute right-3 top-1/2 z-10 -translate-y-1/2 sm:right-6" onClick={onNext} aria-label="Keyingi (o'ngga strelka)">
          <Icon name="arrow-right" size={20} />
        </button>
      </div>

      {/* caption + thumbs */}
      <div className="pb-5">
        <p className="px-4 pb-3 text-center text-[0.9rem] font-semibold text-white/80 sm:px-7">{item.alt}</p>
        <div className="lb-strip">
          {items.map((g, i) => (
            <button key={g.id} type="button" className={`relative h-[54px] w-[74px] flex-none overflow-hidden rounded-[10px] border-2 ${i === index ? "border-[color:var(--accent)] opacity-100" : "border-transparent opacity-45 hover:opacity-80"}`} onClick={() => onSelect(i)} aria-current={i === index} aria-label={`Lavha ${i + 1}: ${g.alt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.type === "video" ? (g.poster ?? g.src) : g.src} alt="" className="h-full w-full object-cover" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
