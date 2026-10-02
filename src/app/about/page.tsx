import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHeader } from "@/components/sections/Intro";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon, type IconName } from "@/components/ui/Icon";
import { VALUES, TIMELINE } from "@/data/about";
import { STATS } from "@/data/stats";
import { FACILITIES } from "@/data/facilities";
import { StatCounter } from "@/components/sections/StatCounter";
import { CtaBanner } from "@/components/sections/CtaBanner";

export const metadata: Metadata = {
  title: "Maktab haqida",
  description:
    "202-sonli umumiy o‘rta ta’lim maktabi — tarix, missiya, qadriyatlar va inshootlar. Chilonzor tumani, Toshkent shahri.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Maktab haqida"
        title={<>Bitta manzil — cheksiz imkoniyatlar</>}
        description="202-maktab — Chilonzordagi umumiy o‘rta ta’lim maskani. Bu sahifada missiyamiz, qadriyatlarimiz va maktabimiz bilan tanishing."
        crumbs={[{ label: "Maktab haqida" }]}
        image="/images/hero.jpg"
      />

      {/* story — editorial split */}
      <section data-ambient="/images/intro.jpg" className="section-pad" aria-label="Maktab hikoyasi">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow">Hikoyamiz</p>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="h2 mt-4">
                Maktab — shunchaki bino emas, <em className="em-accent">umumiy uy.</em>
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <div className="article-body mt-7">
                <p>
                  Har tong maktabimizda yangi kashfiyot bilan boshlanadi: birinchi sinf o‘quvchisi birinchi harfini
                  yozadi, katta sinf o‘quvchisi olimpiadaga tayyorlanadi, ustoz yangi dars metodikasini sinab ko‘radi.
                </p>
                <p>
                  202-maktab Chilonzor tumanining faol ta’lim maskanlaridan biri. Biz davlat ta’lim standartlariga
                  tayanmiz va shu bilan birga har bir o‘quvchining qiziqishini davolab, individual yo‘l topishga
                  harakat qilamiz.
                </p>
                <blockquote>
                  «Maktab — bolaning ikkinchi uyi. Uy qanday issiq bo‘lsa, maktab ham shunchalik mehribon bo‘lishi
                  kerak.»
                </blockquote>
                <p className="!text-[0.9rem]">
                  <b>Izoh:</b> maktabning aniq tarixiy boblari va rasmiy hujjatlar arxivdan tasdiqlangach, shu
                  sahifaga qo‘shiladi (Phase-5).
                </p>
              </div>
            </Reveal>
          </div>

          <div className="grid content-start gap-5">
            <Reveal variant="img" className="img-frame shimmer aspect-[16/11]">
              <Image
                src="/images/edu-classroom.jpg"
                alt="Maktab sinfxonasi"
                fill
                sizes="(min-width: 1024px) 46vw, 92vw"
                className="object-cover"
              />
            </Reveal>
            <Reveal variant="img" delay={120} className="img-frame shimmer -mt-1 ml-auto aspect-[16/10] w-[86%]">
              <Image
                src="/images/intro.jpg"
                alt="Maktab koridori"
                fill
                sizes="(min-width: 1024px) 40vw, 80vw"
                className="object-cover"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* mission */}
      <section data-ambient="/images/edu-quality.jpg" className="section-pad-tight" aria-label="Missiya">
        <div className="container-x">
          <Reveal>
            <div className="n relative overflow-hidden p-8 sm:p-14">
              <span className="watermark absolute -right-4 -top-8 hidden sm:block" aria-hidden="true">
                202
              </span>
              <p className="eyebrow">Missiyamiz</p>
              <p className="mt-6 max-w-[30ch] font-display text-[clamp(1.5rem,3vw,2.3rem)] font-extrabold leading-tight tracking-tight">
                Har bir bolada bilimga ishonch, o‘ziga hurmat va kelajakga ochiq qarash uyg‘otish.
              </p>
              <p className="mt-5 max-w-[62ch] text-[0.98rem] leading-relaxed text-muted">
                Bizning missiyamiz jamiyatga foydali, tanqidiy fikrlaydigan va ma’suliyatli fuqarolarni tarbiyalash.
                Buning uchun kuchli o‘qituvchilar jamoasi, zamonaviy muhit va ota-ona hamkorligi — uch asosiy
                ustunimiz.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* values */}
      <section data-ambient="/images/edu-library.jpg" className="section-pad-tight" aria-label="Qadriyatlar">
        <div className="container-x">
          <SectionHeader
            index="01"
            eyebrow="Qadriyatlar"
            title={
              <>
                Biz uchun <em className="em-accent">qimmatli</em> narsalar
              </>
            }
          />
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <Reveal key={v.id}>
                <article className="tile n n-card h-full !min-h-[240px]">
                  <span className="tile-ico">
                    <Icon name={v.icon as IconName} size={22} />
                  </span>
                  <h3 className="h3 mt-2">{v.title}</h3>
                  <p className="mt-3 text-[0.92rem] leading-relaxed text-muted">{v.description}</p>
                </article>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* statistics */}
      <section data-ambient="/images/news-stem.jpg" className="section-pad-tight" aria-label="Raqamlarda">
        <div className="container-x">
          <div className="n grid gap-10 px-7 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.id} delay={i * 80}>
                <StatCounter value={s.value} suffix={s.suffix} label={s.label} />
                <p className="mt-3 text-[0.85rem] leading-relaxed text-faint">{s.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* facilities overview */}
      <section id="facilities" data-ambient="/images/edu-sport.jpg" className="section-pad" aria-label="Inshootlar">
        <div className="container-x">
          <SectionHeader
            index="02"
            eyebrow="Inshootlar"
            title={
              <>
                Maktab ichida <em className="em-accent">qanday?</em>
              </>
            }
            description="Sinfxonalar, sport zali, akt zali, kutubxona va inklyuziv xonalar — kundalik ta’lim muhiti."
          />
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FACILITIES.map((f) => (
              <Reveal key={f.id} variant="img">
                <figure className="mediacard group aspect-[4/3]">
                  <Image src={f.image} alt={f.alt} fill sizes="(min-width: 1024px) 33vw, 92vw" className="object-cover" />
                  <span className="mediacard-scrim" aria-hidden="true" />
                  <figcaption className="mediacard-meta">
                    <span className="kicker !text-white/70">{f.kicker}</span>
                    <span className="mt-1 block font-display text-[1.15rem] font-extrabold text-white">{f.title}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* timeline */}
      <section className="section-pad-tight" aria-label="Maktab tarixi (shakllanmoqda)">
        <div className="container-x">
          <SectionHeader
            index="03"
            eyebrow="Yo‘l xaritasi"
            title={
              <>
                Maktab tarixi — <em className="em-accent">sahifa tayyorlanmoqda</em>
              </>
            }
            description="Tarixiy sanalar va voqealar rasmiy arxivdan tasdiqlangach shu vaqt chizig‘ida joylanadi."
          />
          <div className="relative mx-auto max-w-[760px]">
            <div className="absolute bottom-4 left-[13px] top-2 w-[2px] bg-line" aria-hidden="true" />
            <ol className="grid gap-8">
              {TIMELINE.map((t, i) => (
                <Reveal key={t.id} as="li" delay={i * 90} className="relative pl-12">
                  <span
                    className="absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full bg-[color:var(--surface)] shadow-[var(--shadow-raised-sm)]"
                    aria-hidden="true"
                  >
                    <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                  </span>
                  <span className="kicker">{t.period}</span>
                  <h3 className="h3 mt-1.5">{t.title}</h3>
                  <p className="mt-2 max-w-[58ch] text-[0.93rem] leading-relaxed text-muted">{t.description}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <CtaBanner />
    </>
  );
}
