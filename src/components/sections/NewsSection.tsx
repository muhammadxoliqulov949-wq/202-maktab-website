import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { NEWS, formatDate } from "@/data/news";
import { SectionHeader } from "@/components/sections/Intro";

/** SECTION 08 — News & events. Data-driven; Phase-3 will swap the source to the API. */
export function NewsSection() {
  const [featured, ...rest] = NEWS.slice(0, 4);

  return (
    <section className="section-pad bg-[color:var(--bg-2)]" aria-label="Yangiliklar va tadbirlar">
      <div className="container-x">
        <SectionHeader
          index="08"
          eyebrow="Yangiliklar"
          title={
            <>
              Maktabdagi <em className="em-accent">so‘nggi voqealar</em>
            </>
          }
          description="Tadbirlar, olimpiadalar, ochiq darslar va e’lonlar — bir joyda jamlangan rasmiy xronika."
        />

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          {/* featured */}
          <Reveal variant="scale">
            <Link
              href={`/news/${featured.slug}`}
              className="mediacard group block h-full min-h-[420px]"
              aria-label={featured.title}
            >
              <Image
                src={featured.image}
                alt={featured.alt}
                fill
                sizes="(min-width: 1024px) 55vw, 92vw"
                className="object-cover"
              />
              <span className="mediacard-scrim !opacity-90" aria-hidden="true" />
              <span className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
                <span className="flex flex-wrap items-center gap-3">
                  <span className="tag tag-dark">{featured.category}</span>
                  <time dateTime={featured.date} className="text-[0.82rem] font-bold text-white/75">
                    {formatDate(featured.date)}
                  </time>
                </span>
                <span className="mt-4 block max-w-[24ch] font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-extrabold leading-[1.15] tracking-tight text-white">
                  {featured.title}
                </span>
                <span className="mt-3 block max-w-[52ch] text-[0.95rem] leading-relaxed text-white/80">
                  {featured.excerpt}
                </span>
                <span className="mt-5 inline-flex items-center gap-2 text-[0.88rem] font-bold text-white">
                  O‘qish
                  <Icon name="arrow-right" size={16} className="btn-ar" />
                </span>
              </span>
            </Link>
          </Reveal>

          {/* side list */}
          <div className="grid content-start gap-4">
            {rest.map((n, i) => (
              <Reveal key={n.slug} delay={i * 90}>
                <Link href={`/news/${n.slug}`} className="n n-card group flex items-stretch gap-0 overflow-hidden" aria-label={n.title}>
                  <span className="img-frame img-zoom shimmer relative !rounded-none w-[124px] flex-none sm:w-[150px]">
                    <Image src={n.image} alt={n.alt} fill sizes="150px" className="object-cover" />
                  </span>
                  <span className="flex flex-1 flex-col justify-center gap-1.5 p-5">
                    <span className="flex flex-wrap items-center gap-2.5">
                      <span className="tag">{n.category}</span>
                      <time dateTime={n.date} className="text-[0.76rem] font-bold text-faint">
                        {formatDate(n.date)}
                      </time>
                    </span>
                    <span className="font-display text-[1.02rem] font-extrabold leading-snug tracking-tight transition-colors group-hover:text-[color:var(--accent-ink)]">
                      {n.title}
                    </span>
                  </span>
                  <span className="hidden items-center pr-5 text-faint transition-all duration-300 group-hover:pr-3 group-hover:text-[color:var(--accent-ink)] sm:flex">
                    <Icon name="arrow-right" size={18} />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-10 flex justify-center">
          <Link href="/news" className="btn btn-primary">
            Barcha yangiliklar
            <Icon name="arrow-right" size={17} className="btn-ar" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
