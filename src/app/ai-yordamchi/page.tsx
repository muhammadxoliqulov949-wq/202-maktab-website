import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AiStudyGuide } from "@/components/ai/AiStudyGuide";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon, type IconName } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "Ziyo AI yo‘ldoshi",
  description: "Ziyo — 202-maktabning sun’iy intellekt ramzi, o‘quvchilar uchun raqamli yo‘ldosh va ilk qadamlar rejalashtiruvchisi.",
};

const FEATURES: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: "route",
    title: "Yo‘lni soddalashtiradi",
    text: "Kerakli sahifa, mavzu yoki keyingi kichik qadamni tez topishga yordam beradi.",
  },
  {
    icon: "clipboard",
    title: "Rejani tartiblaydi",
    text: "Katta vazifani bugun boshlash mumkin bo‘lgan mayda qadamlarga ajratadi.",
  },
  {
    icon: "heart",
    title: "Ishonch beradi",
    text: "O‘quvchi o‘z sur’atida o‘rganishi va savol berishi uchun iliq, xavfsiz hamroh bo‘ladi.",
  },
];

export default function AiGuidePage() {
  return (
    <>
      <section className="ai-guide-hero relative isolate overflow-hidden px-4 pb-14 pt-32 sm:px-6 sm:pb-20 sm:pt-40" aria-labelledby="ai-guide-title">
        <div className="ai-guide-hero-glow ai-guide-hero-glow-one" aria-hidden="true" />
        <div className="ai-guide-hero-glow ai-guide-hero-glow-two" aria-hidden="true" />
        <div className="container-x relative grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <div className="max-w-[670px]">
            <Reveal variant="fade">
              <p className="eyebrow">202-maktab AI yo‘ldoshi</p>
            </Reveal>
            <Reveal delay={70}>
              <h1 id="ai-guide-title" className="display mt-5 text-ink" style={{ fontSize: "clamp(2.6rem,1.2rem + 5vw,4.8rem)" }}>
                Har bir o‘quvchining yonida <em className="em-accent">Ziyo</em> bor.
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="lead mt-6 max-w-[58ch]">
                Ziyo — 202-maktabning sun’iy intellekt ramzi. U o‘quvchini qiziqishidan maqsadigacha kuzatib boradigan,
                mustaqil o‘rganishga chorlaydigan raqamli yo‘ldoshdir.
              </p>
            </Reveal>
            <Reveal delay={210} className="mt-8 flex flex-wrap gap-3">
              <a href="#reja" className="btn btn-primary">
                Birinchi rejani tuzish
                <Icon name="arrow-down" size={17} className="btn-ar" />
              </a>
              <Link href="/education" className="btn btn-ghost">
                Ta’lim sahifasi
                <Icon name="arrow-up-right" size={16} className="btn-ar-diag" />
              </Link>
            </Reveal>
          </div>

          <Reveal variant="scale" delay={120}>
            <div className="ai-guide-hero-mascot">
              <div className="ai-guide-hero-mascot-frame">
                <Image
                  src="/images/ai-mentor-owl.webp"
                  alt="Ziyo — 202-maktabning sun’iy intellekt yo‘ldoshi"
                  fill
                  priority
                  sizes="(min-width: 1024px) 46vw, 92vw"
                  className="object-cover object-center"
                />
              </div>
              <div className="ai-guide-hero-bubble ai-guide-hero-bubble-top">
                <Icon name="atom" size={18} />
                <span>Qiziqishdan bilimga</span>
              </div>
              <div className="ai-guide-hero-bubble ai-guide-hero-bubble-bottom">
                <span className="ai-mentor-status-dot" aria-hidden="true" />
                <span>Yonma-yon o‘rganamiz</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="reja" className="section-pad" aria-label="Ziyo bilan o‘quv rejasini boshlash">
        <div className="container-x">
          <AiStudyGuide />
        </div>
      </section>

      <section className="section-pad-tight" aria-label="Ziyo qanday yordam beradi">
        <div className="container-x">
          <div className="sec-head grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-end md:gap-16">
            <div>
              <Reveal variant="fade">
                <p className="eyebrow">Yordamchi, o‘rnini bosuvchi emas</p>
              </Reveal>
              <Reveal delay={60}>
                <h2 className="h2 mt-4 max-w-[20ch]">
                  Ziyo o‘qituvchi, ota-ona va o‘quvchi hamkorligini <em className="em-accent">kuchaytiradi.</em>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={130}>
              <p className="lead md:pb-1.5">
                Eng yaxshi natija insoniy mehr, ustoz tajribasi va to‘g‘ri texnologiya birlashganda paydo bo‘ladi.
              </p>
            </Reveal>
          </div>
          <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <Reveal key={feature.title}>
                <article className="ai-guide-feature n n-card h-full">
                  <span className="ai-guide-feature-icon">
                    <Icon name={feature.icon} size={23} />
                  </span>
                  <h3 className="h3 mt-5">{feature.title}</h3>
                  <p className="mt-3 text-[0.94rem] leading-relaxed text-muted">{feature.text}</p>
                </article>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      <CtaBanner
        title="Ziyo bilan birga o‘qish yo‘lini boshlang."
        text="O‘quv rejasini tanlang, ta’lim yo‘nalishlari bilan tanishing yoki maktabga o‘z savolingizni yuboring."
      />
    </>
  );
}
