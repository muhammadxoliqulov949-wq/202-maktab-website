import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SmartVideo } from "@/components/media/SmartVideo";
import { HeroFx } from "@/components/sections/HeroFx";
import { HeroBook3D } from "@/components/sections/HeroBook3D";
import { site } from "@/data/site";

/**
 * SECTION 01 — Cinematic hero + 3D "bilim yadrosi".
 *
 * Chapda: sarlavha va harakatlar. O'ngda (desktop): WebGL 3D obyekt —
 * aylanadigan shishasimon yadro, orbital halqalar va "fan" tugunlari
 * (sichqoncha parallaksi + scroll bilan bog'langan).
 *
 * Exactly one viewport tall (100svh); on short screens typography compacts
 * via CSS so everything — CTAs and scroll cue — fits inside the window.
 */
export function Hero() {
  return (
    <section id="bob-hero" className="hero-stage anim-seq relative flex flex-col overflow-hidden" aria-label="Tanitim">
      {/* media */}
      <div className="anim-hero-media absolute inset-0" data-hero-media aria-hidden="true">
        <SmartVideo src="/video/campus.mp4" poster="/images/hero.jpg" className="h-full w-full" label="Maktab binosi va hovlisi" />
        <div className="hero-scrim absolute inset-0" />
        <div className="hero-grain" />
      </div>

      <HeroFx />

      {/* 3D kitob — matn yonidagi bo'sh joyda (hikmat sahifalari) */}
      <div className="hero-3d-wrap anim-fade anim-fade-3" data-hero-3d>
        <HeroBook3D className="herobook-canvas" />
        <span className="hero-3d-glow" aria-hidden="true" />
      </div>

      {/* content */}
      <div className="container-x relative z-10 flex flex-1 flex-col justify-center pb-8 pt-[104px]" data-hero-content>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="anim-fade anim-fade-1 eyebrow eyebrow-light hero-eyebrow mb-6">{site.district}</p>

            <h1 className="display text-white">
              <span className="rl" style={{ ["--i" as string]: 0 }}><span>Bilim, tarbiya</span></span>
              <span className="rl" style={{ ["--i" as string]: 1 }}><span>va kelajak —</span></span>
              <span className="rl" style={{ ["--i" as string]: 2 }}>
                <span>
                  <em className="em-accent-on-dark">bir maskanda.</em>
                </span>
              </span>
            </h1>

            <p className="anim-fade anim-fade-2 hero-support mt-7 max-w-[46ch] text-[1.05rem] font-medium leading-relaxed text-white/85 sm:text-[1.15rem]">
              {site.fullName}. Bizning maktab — o‘quvchining qiziqishi, ustozning tajribasi va ota-onaning ishonchi
              uchrashadigan joy.
            </p>

            <div className="anim-fade anim-fade-3 hero-actions mt-10 flex flex-wrap items-center gap-4">
              <Link href="/about" className="btn btn-accent btn-lg">
                Maktab bilan tanishish
                <Icon name="arrow-right" size={18} className="btn-ar" />
              </Link>
              <Link
                href="/contact#form"
                className="btn btn-lg text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.4)] transition-[background-color,box-shadow,transform] duration-300 hover:bg-white/10 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.65)]"
              >
                Bog‘lanish
                <Icon name="arrow-up-right" size={17} className="btn-ar-diag" />
              </Link>
            </div>

            {/* glass stat strip — hero uchun premium "jonli" tafsilot */}
            <dl className="anim-fade anim-fade-4 hero-stats mt-10 hidden max-w-[520px] gap-3 sm:grid sm:grid-cols-3">
              {[
                { k: "1 240+", v: "O‘quvchi" },
                { k: "86", v: "Malakali ustoz" },
                { k: "24", v: "Fan to‘garagi" },
              ].map((s) => (
                <div key={s.v} className="hero-stat">
                  <dt className="hero-stat-k">{s.k}</dt>
                  <dd className="hero-stat-v">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* bottom row: scroll cue */}
      <div className="container-x anim-fade anim-fade-4 relative z-10 flex items-end justify-between hero-bottom pb-9">
        <div data-hero-cue>
          <a href="#intro" className="scroll-cue group" aria-label="Pastga suring — tanishuv bo‘limi">
            <span className="scroll-cue-track" aria-hidden="true" />
            Pastga suring
          </a>
        </div>
        <p className="hidden text-right text-[0.8rem] font-semibold leading-relaxed text-white/70 md:block">
          Prototip: hozircha vaqtinchalik media <br className="hidden lg:block" /> va namunaviy matndan foydalanilmoqda
        </p>
      </div>
    </section>
  );
}
