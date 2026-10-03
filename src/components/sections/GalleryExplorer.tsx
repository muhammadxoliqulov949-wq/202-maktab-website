"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { GALLERY, GALLERY_ALBUMS, GALLERY_CATEGORIES } from "@/data/gallery";
import { Lightbox } from "@/components/sections/Lightbox";

/** Gallery browser — category + album filters, editorial mosaic, accessible lightbox. */
export function GalleryExplorer() {
  const [category, setCategory] = useState<string>("Barchasi");
  const [album, setAlbum] = useState<string>("Barcha albomlar");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      GALLERY.filter(
        (g) => (category === "Barchasi" || g.category === category) && (album === "Barcha albomlar" || g.album === album)
      ),
    [category, album]
  );

  const openAt = (i: number) => setLightboxIndex(i);
  const close = useCallback(() => setLightboxIndex(null), []);
  const move = useCallback(
    (dir: 1 | -1) => setLightboxIndex((i) => (i === null ? null : (i + dir + filtered.length) % filtered.length)),
    [filtered.length]
  );

  /* global keyboard control while the lightbox is open */
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, close, move]);

  /* touch swipe inside the lightbox */
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(dx) > 48) move(dx < 0 ? 1 : -1);
    touchStart.current = null;
  };

  const activeItem = lightboxIndex !== null ? filtered[lightboxIndex] : null;

  const masonrySpan = (i: number) =>
    i % 5 === 0 ? "sm:col-span-2 aspect-[16/10]" : i % 5 === 3 ? "sm:row-span-2 aspect-[3/4]" : "aspect-square";

  return (
    <div>
      {/* filters */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Media toifalari">
          {["Barchasi", ...GALLERY_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              className="fpill"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-auto">
          <label htmlFor="album" className="sr-only">Albom tanlash</label>
          <select
            id="album"
            className="field !py-3 lg:w-[220px]"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
          >
            {GALLERY_ALBUMS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* mosaic */}
      {filtered.length === 0 ? (
        <div className="n p-16 text-center">
          <h2 className="h3">Bu bo‘sh</h2>
          <p className="mt-3 text-muted">Tanlangan toifa/albom kombinatsiyasida media yo‘q.</p>
        </div>
      ) : (
        <div className="rail grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {filtered.map((g, i) => (
            <button
              key={g.id}
              type="button"
              className={`mediacard group relative w-full overflow-hidden text-left ${masonrySpan(i)}`}
              onClick={() => openAt(i)}
              aria-label={`Kattalashtirib ko'rish: ${g.alt}`}
              aria-haspopup="dialog"
            >
              {g.type === "image" ? (
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 92vw"
                  className="object-cover"
                />
              ) : (
                <>
                  <Image src={g.poster ?? g.src} alt={g.alt} fill sizes="(min-width: 640px) 33vw, 92vw" className="object-cover" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-110" aria-hidden="true">
                      <Icon name="play" size={26} />
                    </span>
                  </span>
                </>
              )}
              <span className="mediacard-scrim" aria-hidden="true" />
              <span className="mediacard-chip">{g.category}</span>
              <span className="mediacard-meta">
                <span className="text-[0.9rem] font-bold text-white">{g.album}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-[0.84rem] font-semibold text-faint" role="status">
        {filtered.length} ta media — prototip materiallar (real maktab fotoları Phase-5 da)
      </p>

      {/* lightbox */}
      {activeItem ? (
        <Lightbox
          item={activeItem}
          index={lightboxIndex!}
          total={filtered.length}
          onClose={close}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          onSelect={(i) => setLightboxIndex(i)}
          items={filtered}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        />
      ) : null}
    </div>
  );
}
