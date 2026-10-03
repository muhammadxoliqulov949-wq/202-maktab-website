import Image from "next/image";
import Link from "next/link";
import { Reveal, RevealLines } from "@/components/motion/Reveal";

/**
 * Inner-page hero — deep navy slab with editorial title, breadcrumbs,
 * supporting copy and its own media per page.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  crumbs,
  image,
  imageAlt = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  crumbs: Array<{ href?: string; label: string }>;
  image: string;
  imageAlt?: string;
}) {
  return (
    <section data-ambient={image} className="page-hero relative overflow-hidden pb-14 pt-[130px] sm:pb-20 sm:pt-[150px]">
      <div className="absolute inset-0" aria-hidden="true">
        <Image src={image} alt={imageAlt} fill sizes="100vw" priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(10,18,33,0.9)] via-[rgba(10,18,33,0.78)] to-[rgba(10,18,33,0.9)]" />
        <div className="hero-grain" />
      </div>

      <div className="container-x relative">
        <nav aria-label="Sahifa yo‘nalishi" className="crumbs mb-8">
          <Link href="/">Bosh sahifa</Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2.5">
              <span aria-hidden="true" className="opacity-50">/</span>
              {c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page" className="text-white">{c.label}</span>}
            </span>
          ))}
        </nav>

        <Reveal variant="fade">
          <p className="eyebrow eyebrow-light">{eyebrow}</p>
        </Reveal>

        <h1 className="display mt-5 max-w-[16ch] text-white" style={{ fontSize: "clamp(2.4rem,1.2rem + 4.4vw,4.2rem)" }}>
          <RevealLines lines={[title]} />
        </h1>

        {description ? (
          <Reveal delay={160}>
            <p className="lead mt-6 max-w-[56ch] text-white/80">{description}</p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
