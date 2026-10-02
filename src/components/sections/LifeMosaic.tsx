import Image from "next/image";
import Link from "next/link";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { LIFE_ITEMS } from "@/data/life";

const ratioClass: Record<string, string> = {
  tall: "aspect-[3/4]",
  wide: "aspect-[16/10]",
  square: "aspect-square",
};

/**
 * SECTION 05 — Immersive school life.
 * Editorial mosaic with varied aspect ratios; cinematic hover on desktop,
 * always-visible captions on touch. Taps lead to /gallery.
 */
export function LifeMosaic() {
  return (
    <section className="section-pad relative overflow-hidden" aria-label="Maktab hayoti">
      {/* watermark */}
      <span className="watermark absolute -top-6 right-2 hidden lg:block" aria-hidden="true">
        HAYOT
      </span>

      <div className="container-x">
        <div className="sec-head grid md:grid-cols-[1.2fr_0.8fr] md:items-end md:gap-16">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow">
                <span className="sec-index mr-1">05</span> Galereya
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h2 mt-4">
                Maktab <em className="em-accent">hayoti</em> — ichidan ko‘ring
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <p className="lead">
              Darslar, sport, ijod va tadbirlar — maktabdagi kunlar bir qarashda. To‘liq arxiv Galereya sahifasida.
            </p>
          </Reveal>
        </div>

        <Stagger className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {LIFE_ITEMS.map((item, i) => (
            <Reveal
              key={item.id}
              variant="img"
              delay={(i % 4) * 70}
              className={item.ratio === "wide" ? "col-span-2" : ""}
            >
              <Link
                href="/gallery"
                className={`mediacard group block ${ratioClass[item.ratio]}`}
                aria-label={`${item.category}: ${item.title} — galereyada ko‘rish`}
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 46vw"
                  className="object-cover"
                />
                <span className="mediacard-scrim" aria-hidden="true" />
                <span className="mediacard-chip">
                  <Icon name="eye" size={13} />
                  {item.category}
                </span>
                <span className="mediacard-meta">
                  <span className="block font-display text-[1.02rem] font-bold leading-snug text-white">
                    {item.title}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-2 text-[0.8rem] font-bold text-white/80 transition-colors group-hover:text-white">
                    Galereyada ko‘rish
                    <Icon name="arrow-up-right" size={14} className="btn-ar-diag" />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}

          {/* closing banner tile — completes the grid on every breakpoint */}
          <Reveal delay={180} className="col-span-2 lg:col-span-4">
            <Link
              href="/gallery"
              className="n group relative flex items-center justify-between gap-6 overflow-hidden p-7 transition-transform duration-500 hover:-translate-y-1 sm:p-9"
              aria-label="Galereya sahifasini ochish"
            >
              <span className="bg-stripes absolute inset-0 opacity-40" aria-hidden="true" />
              <span className="relative">
                <span className="kicker block">Galereya</span>
                <span className="mt-2 block font-display text-[clamp(1.25rem,2.4vw,1.8rem)] font-extrabold leading-tight tracking-tight">
                  Barcha lavhalar — <em className="em-accent">bir joyda</em>
                </span>
                <span className="mt-2 block text-[0.92rem] font-semibold text-muted">
                  Rasmlar, videolar va albomlar to‘liq ekranda ko‘rish bilan
                </span>
              </span>
              <span className="tile-arrow relative !h-14 !w-14 flex-none !rounded-[18px]">
                <Icon name="arrow-right" size={22} />
              </span>
            </Link>
          </Reveal>
        </Stagger>
      </div>
    </section>
  );
}
