"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { NEWS, NEWS_CATEGORIES, formatDate } from "@/data/news";

const PAGE_SIZE = 6;

/** News browser — featured story, category filter, load-more. */
export function NewsExplorer() {
  const [category, setCategory] = useState<string>("Barchasi");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = NEWS.filter((n) => category === "Barchasi" || n.category === category);
  const featured = filtered[0];
  const rest = filtered.slice(1, visible);
  const hasMore = filtered.length > visible;

  return (
    <div>
      {/* filters */}
      <div className="mb-10 flex flex-wrap gap-2" role="group" aria-label="Yangiliklar toifalari">
        {["Barchasi", ...NEWS_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            className="fpill"
            aria-pressed={category === c}
            onClick={() => {
              setCategory(c);
              setVisible(PAGE_SIZE);
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="n p-16 text-center">
          <h2 className="h3">Bu toifada hozircha yangilik yo‘q</h2>
          <p className="mt-3 text-muted">Boshqa toifani tanlab ko‘ring.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* featured */}
          {featured && (
            <Link href={`/news/${featured.slug}`} className="mediacard group block min-h-[360px] sm:min-h-[440px]" aria-label={featured.title}>
              <Image src={featured.image} alt={featured.alt} fill sizes="92vw" className="object-cover" />
              <span className="mediacard-scrim !opacity-90" aria-hidden="true" />
              <span className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
                <span className="flex flex-wrap items-center gap-3">
                  <span className="tag tag-dark">Asosiy xabar</span>
                  <span className="tag tag-dark">{featured.category}</span>
                  <time dateTime={featured.date} className="text-[0.82rem] font-bold text-white/75">
                    {formatDate(featured.date)} • {featured.readingTime}
                  </time>
                </span>
                <span className="mt-4 block max-w-[26ch] font-display text-[clamp(1.5rem,3vw,2.3rem)] font-extrabold leading-[1.12] text-white">
                  {featured.title}
                </span>
                <span className="mt-3 hidden max-w-[60ch] text-[0.95rem] leading-relaxed text-white/80 sm:block">
                  {featured.excerpt}
                </span>
              </span>
            </Link>
          )}

          {/* grid */}
          <div className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((n) => (
              <Link key={n.slug} href={`/news/${n.slug}`} className="n n-card group flex flex-col overflow-hidden" aria-label={n.title}>
                <span className="img-frame img-zoom shimmer relative aspect-[16/10] !rounded-none">
                  <Image src={n.image} alt={n.alt} fill sizes="(min-width: 1024px) 30vw, 92vw" className="object-cover" />
                </span>
                <span className="flex flex-1 flex-col gap-2 p-6">
                  <span className="flex flex-wrap items-center gap-2.5">
                    <span className="tag">{n.category}</span>
                    <time dateTime={n.date} className="text-[0.76rem] font-bold text-faint">
                      {formatDate(n.date)}
                    </time>
                  </span>
                  <span className="font-display text-[1.12rem] font-extrabold leading-snug tracking-tight transition-colors group-hover:text-[color:var(--accent-ink)]">
                    {n.title}
                  </span>
                  <span className="text-[0.88rem] leading-relaxed text-muted">{n.excerpt}</span>
                  <span className="mt-auto inline-flex items-center gap-2 pt-3 text-[0.85rem] font-bold text-[color:var(--accent-ink)]">
                    O‘qish
                    <Icon name="arrow-right" size={15} className="btn-ar" />
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-4">
              <button type="button" className="btn btn-primary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Yana yangiliklar
                <Icon name="arrow-down" size={17} />
              </button>
            </div>
          ) : null}

          <p className="text-center text-[0.84rem] font-semibold text-faint" role="status">
            {Math.min(visible, filtered.length)} / {filtered.length} xabar ko‘rsatilmoqda
          </p>
        </div>
      )}
    </div>
  );
}
