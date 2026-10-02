import type { Metadata } from "next";
import { PageHero } from "@/components/sections/PageHero";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ContactForm } from "@/components/forms/ContactForm";
import { site } from "@/data/site";
import { FAQS } from "@/data/faq";

export const metadata: Metadata = {
  title: "Aloqa",
  description: "202-maktab bilan bog‘lanish: manzil, telefon, elektron pochta, ish vaqti va murojaat formasi.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Aloqa"
        title={<>Biz siz uchun doim mavjudmiz</>}
        description="Qabul, hujjatlar, to‘garaklar yoki hamkorlik haqida murojaat qiling — javob berish bizning burchimiz."
        crumbs={[{ label: "Aloqa" }]}
        image="/images/intro.jpg"
      />

      {/* contact cards */}
      <section className="section-pad-tight" aria-label="Aloqa ma'lumotlari">
        <div className="container-x">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "pin", title: "Manzil", line1: site.address, line2: "Prototip — aniq koordinata Phase-5 da" },
              { icon: "phone", title: "Telefon", line1: site.phone.display, line2: site.mobile.display, href: site.phone.href },
              { icon: "mail", title: "Elektron pochta", line1: site.email.display, line2: "Ish kunlari javob beramiz", href: site.email.href },
              { icon: "clock", title: "Ish vaqti", line1: site.hours[0].time, line2: site.hours[0].days },
            ].map((c) => (
              <Reveal key={c.title}>
                <article className="tile n n-card h-full !min-h-[190px]">
                  <span className="tile-ico">
                    <Icon name={c.icon as never} size={21} />
                  </span>
                  <h2 className="h3 mt-2 !text-[1.05rem]">{c.title}</h2>
                  {c.href ? (
                    <a href={c.href} className="mt-2 block font-bold text-[color:var(--accent-ink)] transition-opacity hover:opacity-80">
                      {c.line1}
                    </a>
                  ) : (
                    <p className="mt-2 font-bold">{c.line1}</p>
                  )}
                  <p className="mt-1 text-[0.82rem] leading-snug text-faint">{c.line2}</p>
                </article>
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* form + map */}
      <section className="section-pad-tight" aria-label="Murojaat formasi va xarita">
        <div className="container-x grid gap-8 lg:grid-cols-2">
          <div id="form" className="scroll-mt-28">
            <Reveal variant="fade">
              <p className="eyebrow mb-4">Murojaat yuborish</p>
            </Reveal>
            <Reveal>
              <ContactForm />
            </Reveal>
          </div>

          <div id="map" className="scroll-mt-28">
            <Reveal variant="fade">
              <p className="eyebrow mb-4">Xaritada topish</p>
            </Reveal>
            <Reveal className="map-shell h-[420px] lg:h-[calc(100%-52px)] lg:min-h-[520px]">
              <iframe
                src={site.map.embed}
                title="Maktab joylashuvi (prototip xarita)"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </Reveal>
            <Reveal delay={100} className="mt-4 flex flex-wrap gap-3">
              <a href={site.map.route} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                Yo‘nalish olish
                <Icon name="route" size={16} />
              </a>
              <a href={site.map.view} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                Xaritada ko‘rish
                <Icon name="arrow-up-right" size={15} className="btn-ar-diag" />
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="band section-pad scroll-mt-24" aria-label="Savol-javoblar">
        <div className="container-x grid gap-10 lg:grid-cols-[0.7fr_1fr] lg:gap-16">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow">
                <span className="sec-index mr-1">FAQ</span> Savol-javob
              </p>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="h2 mt-4">
                Ko‘p beriladigan <em className="em-accent">savollar</em>
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className="lead mt-5 max-w-[44ch]">
                Javobini topa olmadingizmi? Aloqa formasi orqali yozing — ma’muriyat javob beradi.
              </p>
            </Reveal>
          </div>

          <div className="grid content-start gap-3.5">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <details className="faq-item group">
                  <summary>
                    {f.q}
                    <span className="faq-x" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <div className="faq-body">{f.a}</div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
