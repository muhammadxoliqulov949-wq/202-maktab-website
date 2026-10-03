import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { STATS } from "@/data/stats";
import { StatCounter } from "@/components/sections/StatCounter";

/** SECTION 03 — School in numbers. Data comes from src/data/stats.ts (DB-ready). */
export function Stats() {
  return (
    <section className="relative" aria-label="Maktab raqamlarda">
      <div className="container-x">
        <div className="n overflow-hidden" data-parallax="0.06">
          {/* top row */}
          <div className="stats-grid grid gap-10 border-b border-line px-7 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4 lg:gap-6 lg:py-14">
            {STATS.map((s, i) => (
              <Reveal key={s.id} delay={i * 90}>
                <div className="stat-row flex items-start gap-4">
                  <span className="tile-ico mb-0 flex-none !h-12 !w-12">
                    <Icon name={s.icon as never} size={21} />
                  </span>
                  <StatCounter value={s.value} suffix={s.suffix} label={s.label} />
                </div>
                <p className="stat-desc mt-4 pl-16 text-[0.85rem] leading-relaxed text-faint sm:pl-16">{s.description}</p>
              </Reveal>
            ))}
          </div>
          {/* bottom note */}
          <div className="stats-note flex flex-col items-center justify-between gap-4 px-7 py-7 sm:flex-row sm:px-10">
            <p className="text-center text-[0.92rem] font-semibold text-muted sm:text-left">
              Raqamlar — <b className="text-ink">namunaviy prototip qiymatlar.</b> Rasmiy statistika Phase-3 ma’lumotlar bazasidan keladi.
            </p>
            <span className="chip chip-accent flex-none">
              <span className="badge-dot" aria-hidden="true" />
              Ma’lumotlar bazasiga tayyor
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
