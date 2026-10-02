"use client";

import { useEffect, useRef, useState } from "react";

type SmartVideoProps = {
  src: string;
  poster: string;
  className?: string;
  label: string;
};

/**
 * Lazy cinematic background video:
 * - never downloads on "Save-Data" or 2G-like connections (poster stays)
 * - attaches src only when the hero is near the viewport
 * - respects prefers-reduced-motion (poster-only)
 * - muted + playsInline + loop + preload=none
 */
export function SmartVideo({ src, poster, className, label }: SmartVideoProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const saveData = conn?.saveData === true;
    const slow = conn?.effectiveType ? /(^|-)2g$/.test(conn.effectiveType) : false;

    if (reduced || saveData || slow) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // verify the video exists before switching away from the poster
          fetch(src, { method: "HEAD" })
            .then((r) => {
              if (r.ok) setAllowed(true);
            })
            .catch(() => {
              /* keep poster */
            });
          io.disconnect();
        }
      },
      { rootMargin: "220px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (allowed && v) {
      // a <source> was attached post-render — reload, then attempt playback
      v.load();
      v.play().catch(() => {
        /* autoplay policies — the poster remains as fallback */
      });
    }
  }, [allowed]);

  return (
    <div ref={hostRef} className={className}>
      <video
        ref={videoRef}
        poster={poster}
        muted
        loop
        playsInline
        autoPlay={allowed}
        preload={allowed ? "auto" : "none"}
        aria-label={label}
        aria-hidden="true"
        tabIndex={-1}
        disablePictureInPicture
        className="h-full w-full object-cover"
      >
        {allowed ? <source src={src} type="video/mp4" /> : null}
      </video>
    </div>
  );
}
