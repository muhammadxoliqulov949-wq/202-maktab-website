import Image from "next/image";
import Link from "next/link";
import { Reveal, Stagger } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { PEOPLE } from "@/data/people";
import { SectionHeader } from "@/components/sections/Intro";

/** Teacher card — reusable; photo or elegant initial-avatar (until real photos arrive). */
export function PersonCard({ person }: { person: (typeof PEOPLE)[number] }) {
  const initials = person.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <article className="person n n-card h-full p-4 pb-6" data-tilt data-tilt-strength="8">
      <div className="person-photo aspect-[4/5]">
        {person.photo ? (
          <Image
            src={person.photo}
            alt={person.alt}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 43vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-stripes" aria-hidden="true">
            <span className="grid h-24 w-24 place-items-center rounded-full bg-[color:var(--surface)] font-display text-[1.9rem] font-extrabold tracking-tight text-[color:var(--accent-ink)] shadow-[var(--shadow-raised-sm)]">
              {initials}
            </span>
            <span className="rounded-full bg-[color:var(--surface)] px-3.5 py-1.5 text-[0.7rem] font-bold uppercase tracking-wider text-faint shadow-[var(--shadow-flat)]">
              Fotosurati tez orada
            </span>
          </div>
        )}
        <span className="person-accent" aria-hidden="true" />
      </div>
      <div className="px-1.5 pt-5">
        <h3 className="font-display text-[1.08rem] font-extrabold leading-snug tracking-tight">{person.name}</h3>
        <p className="mt-1.5 text-[0.88rem] font-semibold leading-snug text-[color:var(--accent-ink)]">{person.role}</p>
        <p className="mt-2 text-[0.8rem] font-semibold text-faint">{person.experience}</p>
      </div>
    </article>
  );
}

/** SECTION 07 — Teachers / team preview. Layout is data-driven (any count works). */
export function TeamSection() {
  /* diverse preview: director, primary teacher, math teacher, PE coach */
  const PREVIEW_IDS = ["p-01", "p-05", "p-04", "p-10"];
  const preview = PREVIEW_IDS.map((id) => PEOPLE.find((p) => p.id === id)).filter(
    (p): p is (typeof PEOPLE)[number] => Boolean(p)
  );

  return (
    <section className="section-pad" aria-label="Maktab jamoasi">
      <div className="container-x">
        <SectionHeader
          index="07"
          eyebrow="Jamoa"
          title={
            <>
              Bolalar bilan <em className="em-accent">bir yo‘lda</em> yuruvchilar
            </>
          }
          description="Pedagoglar — maktabning asosiy qiymati. Tajribali ustozlar har bir o‘quvchining o‘sish yo‘lini birga bosib o‘tadi."
        />

        <Stagger className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {preview.map((p) => (
            <Reveal key={p.id} variant="flip" delay={60}>
              <PersonCard person={p} />
            </Reveal>
          ))}
        </Stagger>

        <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/team" className="btn btn-primary">
            Jamoamiz bilan tanishing
            <Icon name="arrow-right" size={17} className="btn-ar" />
          </Link>
          <span className="text-[0.85rem] font-semibold text-faint">
            Prototip ismlar — rasmiy ro‘yxat Phase-5 da joylanadi
          </span>
        </Reveal>
      </div>
    </section>
  );
}
