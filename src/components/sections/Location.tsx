import { Reveal } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { site } from "@/data/site";

/** SECTION 10 — Location & contact preview with prototype map. */
export function Location() {
  return (
    <section className="band section-pad" aria-label="Manzil va aloqa">
      <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch lg:gap-16">
        <div className="flex flex-col justify-center">
          <Reveal variant="fade">
            <p className="eyebrow">
              <span className="sec-index mr-1">10</span> Manzil
            </p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="h2 mt-4">
              Bizni <em className="em-accent">topib kelishingiz</em> oson
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="lead mt-5">{site.address}</p>
          </Reveal>

          <Reveal delay={180}>
            <ul className="mt-8 grid gap-4">
              <li className="n-flat flex items-center gap-4 p-4">
                <span className="qlink-ico !h-11 !w-11">
                  <Icon name="phone" size={19} />
                </span>
                <span>
                  <span className="block text-[0.78rem] font-bold uppercase tracking-wider text-faint">Telefon</span>
                  <a href={site.phone.href} className="font-bold transition-colors hover:text-[color:var(--accent-ink)]">
                    {site.phone.display}
                  </a>
                </span>
              </li>
              <li className="n-flat flex items-center gap-4 p-4">
                <span className="qlink-ico !h-11 !w-11">
                  <Icon name="mail" size={19} />
                </span>
                <span>
                  <span className="block text-[0.78rem] font-bold uppercase tracking-wider text-faint">Elektron pochta</span>
                  <a href={site.email.href} className="font-bold transition-colors hover:text-[color:var(--accent-ink)]">
                    {site.email.display}
                  </a>
                </span>
              </li>
              <li className="n-flat flex items-center gap-4 p-4">
                <span className="qlink-ico !h-11 !w-11">
                  <Icon name="clock" size={19} />
                </span>
                <span>
                  <span className="block text-[0.78rem] font-bold uppercase tracking-wider text-faint">Ish vaqti</span>
                  <b>{site.hours[0].time}</b> <span className="text-muted">— {site.hours[0].days}</span>
                </span>
              </li>
            </ul>
          </Reveal>

          <Reveal delay={240} className="mt-8 flex flex-wrap gap-3">
            <a href={site.map.route} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Xaritada ko‘rish
              <Icon name="route" size={17} />
            </a>
            <a href="/contact" className="btn btn-ghost">
              Aloqa sahifasi
            </a>
          </Reveal>

          <Reveal delay={300} className="mt-6">
            <span className="proto-note">
              <Icon name="alert" size={15} />
              Prototip manzil — tekshirilgan raqam va koordinata Phase-5 da
            </span>
          </Reveal>
        </div>

        {/* map */}
        <Reveal variant="right" className="map-shell min-h-[380px] lg:min-h-full">
          <iframe
            src={site.map.embed}
            title="Maktab joylashuvi (prototip xarita — Chilonzor, Toshkent)"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </Reveal>
      </div>
    </section>
  );
}
