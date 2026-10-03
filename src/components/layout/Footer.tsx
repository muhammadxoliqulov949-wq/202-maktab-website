import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { FOOTER_LINKS, USEFUL_LINKS } from "@/data/nav";
import { site } from "@/data/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="band relative overflow-hidden">
      {/* soft architectural top edge */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--line-strong)] to-transparent" />

      <div className="container-x">
        {/* top */}
        <div className="foot-grid grid gap-12 py-14 md:grid-cols-[1.35fr_1fr_1fr_1.2fr] md:gap-8 md:py-20">
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="202-maktab — bosh sahifa">
              <span className="grid h-[48px] w-[58px] place-items-center rounded-[15px] bg-gradient-to-br from-[color:var(--primary-soft)] to-[color:var(--primary)] shadow-[var(--shadow-btn-dark)]">
                <span className="font-display text-lg font-extrabold text-[color:var(--primary-contrast)]">202</span>
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-lg font-extrabold tracking-tight">202-maktab</span>
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-faint">
                  Umumiy o‘rta ta’lim maktabi
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-[34ch] text-[0.95rem] leading-relaxed text-muted">
              Chilonzorda joylashgan umumiy o‘rta ta’lim maskani. Bilim, tarbiya va kelajak bir maskanda birlashadi.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={site.social.telegram}
                className="icon-btn"
                aria-label="Telegram sahifamiz (tez orada ishga tushadi)"
                rel="noopener noreferrer"
              >
                <Icon name="telegram" size={19} />
              </a>
              <a
                href={site.social.instagram}
                className="icon-btn"
                aria-label="Instagram sahifamiz (tez orada ishga tushadi)"
                rel="noopener noreferrer"
              >
                <Icon name="instagram" size={19} />
              </a>
            </div>
          </div>

          <nav aria-label="Sahifalar">
            <h2 className="kicker mb-5">Sahifalar</h2>
            <ul className="grid gap-2.5">
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[0.95rem] font-semibold text-muted transition-colors hover:text-[color:var(--accent-ink)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Foydali havolalar">
            <h2 className="kicker mb-5">Foydali</h2>
            <ul className="grid gap-2.5">
              {USEFUL_LINKS.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-[0.95rem] font-semibold text-muted transition-colors hover:text-[color:var(--accent-ink)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="kicker mb-5">Aloqa</h2>
            <ul className="grid gap-4 text-[0.95rem]">
              <li className="flex gap-3">
                <Icon name="pin" size={19} className="mt-0.5 flex-none text-[color:var(--accent-ink)]" />
                <span className="text-muted">{site.address}</span>
              </li>
              <li className="flex gap-3">
                <Icon name="phone" size={19} className="mt-0.5 flex-none text-[color:var(--accent-ink)]" />
                <a href={site.phone.href} className="font-semibold transition-colors hover:text-[color:var(--accent-ink)]">
                  {site.phone.display}
                </a>
              </li>
              <li className="flex gap-3">
                <Icon name="mail" size={19} className="mt-0.5 flex-none text-[color:var(--accent-ink)]" />
                <a href={site.email.href} className="font-semibold transition-colors hover:text-[color:var(--accent-ink)]">
                  {site.email.display}
                </a>
              </li>
              <li className="flex gap-3">
                <Icon name="clock" size={19} className="mt-0.5 flex-none text-[color:var(--accent-ink)]" />
                <span className="text-muted">
                  {site.hours[0].days}: <b className="text-ink">{site.hours[0].time}</b>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* bottom */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line py-7 text-[0.84rem] text-faint sm:flex-row">
          <p>© {year} 202-maktab. Barcha huquqlar himoyalangan.</p>
          <p className="flex items-center gap-2">
            <span className="badge-dot inline-block" aria-hidden="true" />
            Sayt prototip holatda — rasmiy ma’lumotlar kelganda yangilanadi
          </p>
        </div>
      </div>
    </footer>
  );
}
