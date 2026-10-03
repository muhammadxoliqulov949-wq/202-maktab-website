import Image from "next/image";
import { FacilitiesStoryClient } from "@/components/sections/FacilitiesStoryClient";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { FACILITIES } from "@/data/facilities";

/**
 * SECTION 06 — Learning environment (editorial showcase).
 * Left: step list (buttons — keyboard accessible). Right: crossfading image.
 * No scroll hijacking: native scrolling untouched; switching is click/IO-based.
 */
export function FacilitiesStory() {
  return (
    <section className="band section-pad" aria-label="Maktab inshootlari">
      <div className="container-x">
        <div className="sec-head grid md:grid-cols-[1.2fr_0.8fr] md:items-end md:gap-16">
          <div>
            <Reveal variant="fade">
              <p className="eyebrow">
                <span className="sec-index mr-1">06</span> O‘quv muhiti
              </p>
            </Reveal>
            <Reveal delay={60}>
              <h2 className="h2 mt-4">
                Inshootlar bilan <em className="em-accent">tanishing</em>
              </h2>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <p className="lead">Sinfxonalardan sport zaligacha — maktab binosi bolaning kundalik tajribasi bo‘lgan muhit.</p>
          </Reveal>
        </div>

        <FacilitiesStoryClient items={FACILITIES} />

        <Reveal className="mt-10 flex justify-center">
          <a href="/about#facilities" className="text-link">
            Barcha inshootlar haqida
            <Icon name="arrow-up-right" size={15} className="btn-ar-diag" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
