import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";

/** Reusable closing CTA band for inner pages. */
export function CtaBanner({
  title = "Savollaringiz bormi? Bizga yozing.",
  text = "Qabul, darslar yoki maktab hayoti haqida — barcha savollar bo‘yicha ochiqmiz.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="section-pad-tight" aria-label="Bog'lanish taklifi">
      <div className="container-x">
        <Reveal>
          <div className="n glass-panel-primary relative overflow-hidden p-8 sm:p-12">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[color:var(--accent)] opacity-25 blur-3xl"
            />
            <div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
              <div>
                <h2 className="font-display text-[clamp(1.4rem,2.6vw,1.9rem)] font-extrabold tracking-tight text-[color:var(--primary-contrast)]">
                  {title}
                </h2>
                <p className="mt-2 max-w-[52ch] text-[0.95rem] text-[color:var(--on-primary-muted)]">{text}</p>
              </div>
              <div className="flex flex-none flex-wrap gap-3">
                <Link href="/contact#form" className="btn btn-accent">
                  Bog‘lanish
                  <Icon name="arrow-up-right" size={16} className="btn-ar-diag" />
                </Link>
                <Link
                  href="/contact#map"
                  className="btn text-[color:var(--primary-contrast)] shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--primary-contrast)_38%,transparent)] backdrop-blur-md transition-colors hover:bg-white/10"
                >
                  Manzil
                  <Icon name="pin" size={16} />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
