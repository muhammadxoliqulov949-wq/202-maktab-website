import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartVideo } from "@/components/media/SmartVideo";
import { site } from "@/data/site";

/**
 * SECTION 01 — Cinematic hero.
 * Full-bleed media (lazy prototype video w/ poster fallback), CSS-orchestrated
 * intro sequence, two CTAs, scroll cue. Respect: prefers-reduced-motion (CSS) +
 * save-data/slow networks (SmartVideo stays on poster).
 */
export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden" aria-label="Tanitim">
      {/* media */}
      <div className="absolute inset-0 anim-hero-media" aria-hidden="true">
        <SmartVideo src="/video/campus.mp4" poster="/images/hero.jpg" className="h-full w-full" label="Maktab binosi va hovlisi" />
        <div className="hero-scrim absolute inset-0" />
        <div className="hero-grain" />
      </div>

      {/* content */}
      <div className="container-x anim-seq relative z-10 flex flex-1 flex-col justify-center pb-16 pt-[110px]">
        <div className="max-w-[880px]">
          <p className="anim-fade anim-fade-1 eyebrow eyebrow-light mb-6">
            {site.district}
          </p>

          <h1 className="display text-white">
            <span className="rl" style={{ ["--i" as string]: 0 }}><span>Bilim, tarbiya</span></span>
            <span className="rl" style={{ ["--i" as string]: 1 }}><span>va kelajak —</span></span>
            <span className="rl" style={{ ["--i" as string]: 2 }}>
              <span>
                <em className="em-accent">bir maskanda.</em>
              </span>
            </span>
          </h1>

          <p className="anim-fade anim-fade-2 mt-7 max-w-[46ch] text-[1.05rem] font-medium leading-relaxed text-white/85 sm:text-[1.15rem]">
            {site.fullName}. Bizning maktab — o‘quvchining qiziqishi, ustozning tajribasi va ota-onaning ishonchi
            uchrashadigan joy.
          </p>

          <div className="anim-fade anim-fade-3 mt-10 flex flex-wrap items-center gap-4">
            <Link href="/about" className="btn btn-accent btn-lg">
              Maktab bilan tanishish
              <Icon name="arrow-right" size={18} className="btn-ar" />
            </Link>
            <Link href="/contact#form" className="btn btn-lg text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.4)] transition-[background-color,box-shadow,transform] duration-300 hover:bg-white/10 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.65)]">
              Bog‘lanish
              <Icon name="arrow-up-right" size={17} className="btn-ar-diag" />
            </Link>
          </div>
        </div>
      </div>

      {/* bottom row: scroll cue */}
      <div className="anim-fade anim-fade-4 container-x relative z-10 flex items-end justify-between pb-9">
        <a href="#intro" className="scroll-cue group" aria-label="Pastga suring — tanishuv bo‘limi">
          <span className="scroll-cue-track" aria-hidden="true" />
          Pastga suring
        </a>
        <p className="hidden text-right text-[0.8rem] font-semibold leading-relaxed text-white/70 md:block">
          Prototip: hozircha vaqtinchalik media <br className="hidden lg:block" /> va namunaviy matndan foydalanilmoqda
        </p>
      </div>
    </section>
  );
}
