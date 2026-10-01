import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { ParallaxImage } from "@/components/media/ParallaxImage";

/** SECTION 11 — Final CTA over architectural imagery. */
export function FinalCta() {
  return (
    <section className="section-pad relative overflow-hidden" aria-label="Bog'lanishga taklif">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <ParallaxImage src="/images/edu-events.jpg" alt="" sizes="100vw" overscan="10%" />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,18,33,0.92)] via-[rgba(10,18,33,0.82)] to-[rgba(10,18,33,0.6)]" />
      </div>

      <div className="container-x relative">
        <div className="max-w-[720px] py-6">
          <Reveal variant="fade">
            <p className="eyebrow eyebrow-light">Aloxrida bog‘laning</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="h2 mt-5 text-white" style={{ maxWidth: "18ch" }}>
              202-maktab bilan yaqindan <em className="em-accent-on-dark">tanishing.</em>
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="lead mt-5 max-w-[52ch] text-white/80">
              Qabul, darslar yoki hamkorlik haqida savolingiz bormi? Biz har doim ochiqmiz — yozing yoki
              to‘g‘ridan-to‘g‘ri tashrif buyuring.
            </p>
          </Reveal>
          <Reveal delay={220} className="mt-9 flex flex-wrap gap-4">
            <Link href="/contact#form" className="btn btn-accent btn-lg">
              Bog‘lanish
              <Icon name="arrow-up-right" size={18} className="btn-ar-diag" />
            </Link>
            <Link href="/contact#map" className="btn btn-lg text-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.4)] transition-[background-color,box-shadow,transform] duration-300 hover:bg-white/10 hover:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.65)]">
              Manzilni ko‘rish
              <Icon name="pin" size={17} />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
