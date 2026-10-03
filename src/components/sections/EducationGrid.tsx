import Image from "next/image";
import Link from "next/link";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon, type IconName } from "@/components/ui/Icon";
import { EDU_FEATURES } from "@/data/education";
import { SectionHeader } from "@/components/sections/Intro";

/**
 * SECTION 04 — Education experience.
 * Desktop: asymmetric editorial mosaic (CSS grid with spans).
 * Mobile: clean vertical stack. Cards are tile-based, not generic.
 */
export function EducationGrid() {
  return (
    <section className="section-pad relative" aria-label="Ta'lim imkoniyatlari">
      <div className="container-x">
        <SectionHeader
          index="04"
          eyebrow="Ta’lim tajribasi"
          title={
            <>
              Nima uchun <em className="em-accent">202-maktab?</em>
            </>
          }
          description="Oltita ustun — darsdan tadbirgacha, kutubxonadan sport zaligacha. Har bir yo‘nalish bolaning to‘liq rivojlanishiga xizmat qiladi."
        />

        <Stagger className="rail grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EDU_FEATURES.map((f, i) => {
            const featured = f.image && i === 1; // asymmetric: the "classrooms" tile becomes media tile
            return (
              <Reveal
                variant="flip"
                key={f.id}
                delay={(i % 3) * 80}
                className={featured ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""}
              >
                <article className={`tile n n-card h-full ${featured ? "min-h-[420px]" : ""}`}>
                  {featured && f.image ? (
                    <div className="img-frame img-zoom shimmer img-frame-tight mb-6 aspect-[16/10] w-full">
                      <Image
                        src={f.image}
                        alt={f.alt ?? f.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 66vw, 92vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <span className="tile-idx">{f.index}</span>
                    <span className="tile-ico mb-0 !h-11 !w-11">
                      <Icon name={f.icon as IconName} size={21} />
                    </span>
                  </div>

                  <h3 className="h3 mt-5">{f.title}</h3>
                  <p className="mt-3 text-[0.93rem] leading-relaxed text-muted">{f.description}</p>

                  <Link
                    href="/education"
                    className="tile-arrow"
                    aria-label={`${f.title} — Ta’lim sahifasida batafsil`}
                  >
                    <Icon name="arrow-up-right" size={18} />
                  </Link>
                </article>
              </Reveal>
            );
          })}

          {/* closing tile — spans two columns to complete the 3×3 editorial grid */}
          <Reveal delay={160} className="sm:col-span-2 lg:col-span-2">
            <Link href="/education" className="tile n glass-panel-primary group flex h-full items-end justify-between overflow-hidden transition-transform duration-500 hover:-translate-y-1.5">
              <div>
                <h3 className="font-display text-[1.35rem] font-extrabold leading-snug text-[color:var(--primary-contrast)]">
                  To‘liq ta’lim tizimi bilan tanishing
                </h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-[color:var(--on-primary-muted)]">
                  Bosqichlar, fanlar va metodika — bitta sahifada.
                </p>
              </div>
              <span className="tile-arrow">
                <Icon name="arrow-right" size={19} />
              </span>
            </Link>
          </Reveal>
        </Stagger>
      </div>
    </section>
  );
}
