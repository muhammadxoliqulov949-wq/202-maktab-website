import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealLines } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { STATS } from "@/data/stats";
import { StatCounter } from "@/components/sections/StatCounter";

/** Shared editorial section header. */
export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  align = "split",
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "split" | "left";
}) {
  if (align === "left") {
    return (
      <div className="sec-head">
        <Reveal variant="fade">
          <p className="eyebrow">
            <span className="sec-index mr-1">{index}</span>
            {eyebrow}
          </p>
        </Reveal>
        <Reveal>
          <h2 className="h2 max-w-[24ch]">{title}</h2>
        </Reveal>
        {description ? (
          <Reveal delay={90}>
            <p className="lead max-w-[58ch]">{description}</p>
          </Reveal>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sec-head grid md:grid-cols-[1.2fr_0.8fr] md:items-end md:gap-16">
      <div>
        <Reveal variant="fade">
          <p className="eyebrow">
            <span className="sec-index mr-1">{index}</span>
            {eyebrow}
          </p>
        </Reveal>
        <Reveal delay={60}>
          <h2 className="h2 mt-4">{title}</h2>
        </Reveal>
      </div>
      {description ? (
        <Reveal delay={140}>
          <p className="lead md:pb-1.5">{description}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** SECTION 02 — editorial school introduction. */
export function Intro() {
  return (
    <section id="intro" className="section-pad" aria-label="Maktab tanishtiruv">
      <div className="container-x grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
        <div>
          <Reveal variant="fade">
            <p className="eyebrow">
              <span className="sec-index mr-1">02</span> Maktab haqida
            </p>
          </Reveal>

          <h2 className="h2 mt-5" style={{ maxWidth: "19ch" }}>
            <RevealLines
              lines={[
                <>Har bir bola uchun</>,
                <>
                  <em className="em-accent">imkoniyat yaratadigan</em>
                </>,
                <>maktab.</>,
              ]}
            />
          </h2>

          <Reveal delay={120}>
            <p className="lead mt-7 max-w-[52ch]">
              202-maktab — Chilonzordagi umumiy o‘rta ta’lim muassasi. Bu yerda har bir o‘quvchining qiziqishi
              qadrlanadi: darslar zamonaviy uslubda o‘tiladi, to‘garaklar va tadbirlar esa bolaga o‘zini sinab ko‘rish
              maydonini beradi.
            </p>
          </Reveal>

          <Reveal delay={190}>
            <p className="mt-5 max-w-[52ch] text-[0.95rem] leading-relaxed text-muted">
              Maqsadimiz oddiy: bugun bilimga chanqoq, ertaga Vataniga foydali fuqarolarni tarbiyalash.
            </p>
          </Reveal>

          <Reveal delay={250} className="mt-9 flex flex-wrap gap-3">
            <Link href="/about" className="btn btn-primary">
              Batafsil ma’lumot
              <Icon name="arrow-right" size={17} className="btn-ar" />
            </Link>
            <Link href="/team" className="btn btn-ghost">
              Jamoa bilan tanishing
            </Link>
          </Reveal>

          <Reveal delay={310} className="mt-12 grid max-w-[460px] grid-cols-3 gap-4">
            {STATS.slice(0, 3).map((s) => (
              <div key={s.id} className="border-l-2 border-[color:var(--accent)] pl-4">
                <StatCounter value={s.value} suffix={s.suffix} label={s.label} compact />
              </div>
            ))}
          </Reveal>
        </div>

        <div className="relative">
          <Reveal variant="img" className="img-frame shimmer aspect-[4/5] max-h-[640px] w-full">
            <Image
              src="/images/intro.jpg"
              alt="Maktab koridori — tabiiy yorug‘lik va shinam o‘quv muhiti"
              fill
              sizes="(min-width: 1024px) 44vw, 92vw"
              className="object-cover"
              priority={false}
            />
          </Reveal>

          <Reveal variant="scale" delay={200} className="n absolute -bottom-7 -left-4 max-w-[260px] p-5 sm:-left-8">
            <div className="flex items-start gap-3.5">
              <span className="tile-ico mb-0 flex-none">
                <Icon name="graduation" size={22} />
              </span>
              <p className="text-[0.88rem] font-semibold leading-snug text-muted">
                1–11-sinflar, katta jamoa va keng imkoniyatlar —{" "}
                <b className="text-ink">hammasi bir binoda.</b>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
