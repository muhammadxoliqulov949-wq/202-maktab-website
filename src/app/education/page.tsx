import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/sections/PageHero";
import { SectionHeader } from "@/components/sections/Intro";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon, type IconName } from "@/components/ui/Icon";
import { STAGES, SUBJECT_GROUPS, METHOD_POINTS, ACTIVITIES } from "@/data/education-page";
import { EDU_FEATURES } from "@/data/education";
import { CtaBanner } from "@/components/sections/CtaBanner";

export const metadata: Metadata = {
  title: "Ta’lim",
  description:
    "202-maktab ta’lim tizimi: boshlang‘ich, umumiy o‘rta va bitiruv bosqichlari, fanlar, metodika va to‘garaklar.",
};

export default function EducationPage() {
  return (
    <>
      <PageHero
        eyebrow="Ta’lim"
        title={<>1–11-sinf: to‘liq ta’lim yo‘li</>}
        description="Davlat standarti asosidagi darslar, zamonaviy metodika va har bir o‘quvchiga mos yondashuv — barchasi bitta tizimda."
        crumbs={[{ label: "Ta’lim" }]}
        image="/images/edu-quality.jpg"
      />

      {/* overview */}
      <section data-ambient="/images/edu-classroom.jpg" className="section-pad" aria-label="Ta'lim haqida qisqacha">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow">Ta’lim yondashuvi</p>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="h2 mt-4">
                Bilim — amaliyot bilan <em className="em-accent">birga</em> o‘zlashtiriladi
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead mt-6 max-w-[54ch]">
                Bizning darslarimizda o‘quvchi faqat tinglovchi emas — u savol beradi, tajriba qiladi va natijani
                o‘zi xulosa qiladi. O‘qituvchi esa yo‘l ko‘rsatuvchi va murabbiy rolini bajaradi.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="article-body mt-7 max-w-[58ch]">
                <p>
                  Ta’lim jarayoni 1-sinfdan 11-sinfgacha uzluksiz: har bir bosqich oldingisining davomi bo‘lib,
                  o‘quvchining bilimi va ko‘nikmalari izchil o‘sib boradi.
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal variant="img" className="img-frame shimmer aspect-[4/3]">
            <Image
              src="/images/edu-library.jpg"
              alt="Kutubxonada mustaqil o'quv zali"
              fill
              sizes="(min-width: 1024px) 42vw, 92vw"
              className="object-cover"
            />
          </Reveal>
        </div>
      </section>

      {/* stages */}
      <section id="stages" data-ambient="/images/edu-quality.jpg" className="band section-pad" aria-label="Ta'lim bosqichlari">
        <div className="container-x">
          <SectionHeader
            index="01"
            eyebrow="Bosqichlar"
            title={
              <>
                Uch bosqichli <em className="em-accent">ta’lim tizimi</em>
              </>
            }
            description="Har bir bosqich o‘z maqsadi va uslubiga ega — bolaning yoshiga mos rivojlanish yo‘li."
          />
          <Stagger className="grid gap-5 lg:grid-cols-3">
            {STAGES.map((s, i) => (
              <Reveal key={s.id}>
                <article className="tile n n-card h-full">
                  <div className="flex items-center justify-between">
                    <span className="tile-idx">0{i + 1}</span>
                    <span className="chip chip-accent">{s.grades} sinflar</span>
                  </div>
                  <h3 className="h3 mt-5">{s.title}</h3>
                  <p className="mt-3 text-[0.93rem] leading-relaxed text-muted">{s.description}</p>
                  <ul className="mt-5 grid gap-2.5 border-t border-line pt-5">
                    {s.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2.5 text-[0.88rem] font-semibold text-muted">
                        <Icon name="check" size={16} className="mt-0.5 flex-none text-[color:var(--accent-ink)]" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* subjects */}
      <section data-ambient="/images/news-stem.jpg" className="section-pad" aria-label="Fanlar">
        <div className="container-x">
          <SectionHeader
            index="02"
            eyebrow="Fanlar"
            title={
              <>
                Keng fan <em className="em-accent">doirasi</em>
              </>
            }
            description="Davlat standarti fanlari — aniq, gumanitar va ijodiy yo‘nalishlar bo‘yicha to‘liq sikl."
          />
          <Stagger className="grid gap-5 md:grid-cols-3">
            {SUBJECT_GROUPS.map((g) => (
              <Reveal key={g.id}>
                <article className="n n-card h-full p-7">
                  <span className="tile-ico">
                    <Icon name={g.icon as IconName} size={22} />
                  </span>
                  <h3 className="h3 mt-4">{g.title}</h3>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {g.items.map((item) => (
                      <li key={item} className="chip !py-2 !text-[0.82rem]">{item}</li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* methodology */}
      <section data-ambient="/images/edu-library.jpg" className="band section-pad" aria-label="Metodika">
        <div className="container-x">
          <SectionHeader
            index="03"
            eyebrow="Metodika"
            title={
              <>
                Dars qanday <em className="em-accent">quriladi?</em>
              </>
            }
          />
          <Stagger className="grid gap-4 sm:grid-cols-2">
            {METHOD_POINTS.map((m, i) => (
              <Reveal key={m.id} delay={i * 70}>
                <div className="n-flat flex h-full gap-5 p-7">
                  <span className="font-display text-[2rem] font-extrabold leading-none text-line-strong">0{i + 1}</span>
                  <div>
                    <h3 className="font-display text-[1.1rem] font-extrabold tracking-tight">{m.title}</h3>
                    <p className="mt-2 text-[0.92rem] leading-relaxed text-muted">{m.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* activities */}
      <section id="activities" data-ambient="/images/life-ijod.jpg" className="section-pad" aria-label="To'garaklar va tadbirlar">
        <div className="container-x">
          <SectionHeader
            index="04"
            eyebrow="Darsdan tashqari"
            title={
              <>
                To‘garaklar va <em className="em-accent">faol hayot</em>
              </>
            }
            description="Darslardan tashqari vaqt — qiziqishni kasbga aylantiradigan maydon."
          />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIVITIES.map((a) => (
              <Reveal key={a.id}>
                <div className="qlink n n-card h-full">
                  <span className="qlink-ico">
                    <Icon name="star" size={20} />
                  </span>
                  <span>
                    <span className="font-display text-[1.02rem] font-extrabold tracking-tight">{a.title}</span>
                    <span className="mt-1 block text-[0.86rem] leading-snug text-muted">{a.description}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* inclusive */}
      <section className="section-pad-tight" aria-label="Inklyuziv ta'lim">
        <div className="container-x">
          <Reveal>
            <div className="n grid overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
              <div className="flex flex-col justify-center p-8 sm:p-12">
                <p className="eyebrow">Inklyuziv ta’lim</p>
                <h2 className="h2 mt-4">
                  Har bir bola uchun — <em className="em-accent">istisnosiz</em>
                </h2>
                <p className="lead mt-5 max-w-[52ch]">
                  Maxsus ehtiyojli o‘quvchilar uchun moslashtirilgan dasturlar, alohida qo‘llab-quvvatlash xonalari va
                  malakali murabbiylar ishlaydi. Har bir holat individual o‘rganiladi.
                </p>
                <ul className="mt-6 grid gap-2.5">
                  {[
                    "Individual rivojlanish rejalari",
                    "Kichik guruhlarda mashg‘ulotlar",
                    "Ota-onalar uchun maslahatlar",
                  ].map((li) => (
                    <li key={li} className="flex items-start gap-2.5 text-[0.92rem] font-semibold text-muted">
                      <Icon name="check" size={16} className="mt-0.5 flex-none text-[color:var(--accent-ink)]" />
                      {li}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative min-h-[320px]">
                <Image
                  src="/images/edu-inclusive.jpg"
                  alt="Inklyuziv ta'lim xonasi"
                  fill
                  sizes="(min-width: 1024px) 45vw, 92vw"
                  className="object-cover"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* facilities strip */}
      <section className="section-pad-tight" aria-label="Inshootlar">
        <div className="container-x">
          <SectionHeader
            index="05"
            eyebrow="Inshootlar"
            title={
              <>
                Ta’lim muhiti <em className="em-accent">sharoitlari</em>
              </>
            }
          />
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {EDU_FEATURES.slice(1).map((f, i) => (
              <Reveal key={f.id} delay={i * 60} variant="img">
                <figure className="mediacard group aspect-[4/5]">
                  {f.image && <Image src={f.image} alt={f.alt ?? f.title} fill sizes="(min-width: 1024px) 20vw, 46vw" className="object-cover" />}
                  <span className="mediacard-scrim" aria-hidden="true" />
                  <figcaption className="mediacard-meta !opacity-100 !translate-y-0">
                    <span className="font-display text-[0.98rem] font-extrabold text-white">{f.title}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      <CtaBanner title="Qabul va to‘garaklar haqida bilmoqchimisiz?" text="Murojaat yuboring — ma’muriyat siz bilan bog‘lanadi." />
    </>
  );
}
