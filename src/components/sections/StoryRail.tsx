"use client";

import { useEffect, useState } from "react";

export type StoryChapter = { id: string; label: string };

/**
 * Story rail — fixed chapter indicator on the right edge (desktop only).
 * IntersectionObserver tracks which chapter is in the reading zone;
 * clicking a dot smooth-scrolls to that chapter (user-initiated).
 */
export function StoryRail({ items }: { items: StoryChapter[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0 || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return (
    <nav className="story-rail" aria-label="Hikoya bo‘limlari">
      {items.map((i) => (
        <a
          key={i.id}
          href={`#${i.id}`}
          className={active === i.id ? "active" : ""}
          aria-label={i.label}
          aria-current={active === i.id ? "true" : undefined}
        >
          <span className="lbl">{i.label}</span>
          <span className="dot" />
        </a>
      ))}
    </nav>
  );
}
