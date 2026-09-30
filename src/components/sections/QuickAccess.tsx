import Link from "next/link";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon, type IconName } from "@/components/ui/Icon";
import { QUICK_LINKS } from "@/data/quicklinks";
import { SectionHeader } from "@/components/sections/Intro";

/** SECTION 09 — Quick access for parents & students. */
export function QuickAccess() {
  return (
    <section className="section-pad" aria-label="Tezkor havolalar">
      <div className="container-x">
        <SectionHeader
          index="09"
          eyebrow="Tez kirish"
          title={
            <>
              Kerakli ma’lumot — <em className="em-accent">bir bosishda</em>
            </>
          }
          description="Ota-onalar va o‘quvchilar uchun eng ko‘p murojaat qilinadigan bo‘limlar."
        />

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((q) => (
            <Reveal key={q.id} delay={40}>
              <Link href={q.href} className="qlink n n-card group h-full">
                <span className="qlink-ico">
                  <Icon name={q.icon as IconName} size={22} />
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-[1.05rem] font-extrabold tracking-tight">{q.title}</span>
                  <span className="mt-1 text-[0.85rem] leading-snug text-muted">{q.description}</span>
                </span>
                <Icon name="arrow-right" size={19} className="qlink-arrow" />
              </Link>
            </Reveal>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
