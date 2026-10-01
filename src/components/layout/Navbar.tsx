"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { NAV_LINKS } from "@/data/nav";
import { site } from "@/data/site";

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 28);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem("m202-theme", next ? "dark" : "light");
    } catch {
      /* storage may be unavailable */
    }
  };

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={dark ? "Yorug‘ rejimga o‘tish" : "Tungi rejimga o‘tish"}
      aria-pressed={dark}
      title={dark ? "Yorug‘ rejim" : "Tungi rejim"}
    >
      <Icon name={dark ? "sun" : "moon"} size={19} />
    </button>
  );
}

function LocaleSwitch() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={`relative ${open ? "dropdown-open" : ""}`}>
      <button
        type="button"
        className="locale-btn flex items-center gap-2 rounded-[14px] px-3.5 py-2.5 font-bold text-[0.88rem] text-muted transition-colors hover:text-ink"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Sayt tili (tez orada rus tili ham qo‘shiladi)"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="globe" size={17} />
        UZ
        <Icon name="chevron-down" size={14} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="dropdown-panel" role="menu" aria-label="Tilni tanlash">
        <button type="button" role="menuitemradio" aria-checked="true" className="dropdown-item">
          O‘zbekcha <Icon name="check" size={15} />
        </button>
        <button
          type="button"
          role="menuitemradio"
          aria-checked="false"
          disabled
          className="dropdown-item cursor-not-allowed opacity-50"
          title="Ruscha versiya tez orada"
        >
          Русский <span className="text-[0.68rem] font-bold uppercase tracking-wider">tez orada</span>
        </button>
      </div>
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  /* close the sheet on route change */
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  /* lock scroll + focus management while the sheet is open */
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!menuOpen || !sheet) return;

    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusables = sheet.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prevFocus?.focus?.();
    };
  }, [menuOpen]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header className={`nav-shell anim-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="container-x">
          <div className="flex h-[76px] items-center gap-3 lg:h-[84px]">
            {/* brand */}
            <Link href="/" className="group flex flex-none items-center gap-3" aria-label="202-maktab — bosh sahifa">
              <span className="grid h-[46px] w-[56px] flex-none place-items-center rounded-[15px] bg-gradient-to-br from-[color:var(--primary-soft)] to-[color:var(--primary)] shadow-[var(--shadow-btn-dark)] transition-transform duration-300 group-hover:-translate-y-0.5">
                <span className="font-display text-[1.06rem] font-extrabold tracking-tight text-[color:var(--primary-contrast)]">
                  202
                </span>
              </span>
              <span className="hidden flex-col leading-tight min-[430px]:flex">
                <span className="font-display text-[1.02rem] font-extrabold tracking-tight">202-maktab</span>
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-faint">
                  Chilonzor • Toshkent
                </span>
              </span>
            </Link>

            {/* desktop nav */}
            <nav className="mx-auto hidden items-center lg:flex" aria-label="Asosiy menyu">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="nav-link" aria-current={isActive(l.href) ? "page" : undefined}>
                  {l.label}
                </Link>
              ))}
            </nav>

            {/* right cluster */}
            <div className={`flex flex-none items-center gap-2 ${"ml-auto xl:ml-0"}`}>
              <div className="hidden xl:block">
                <LocaleSwitch />
              </div>
              <ThemeToggle />
              <Link href="/contact#form" className="nav-cta-mini hidden md:inline-flex">
                Bog‘lanish
                <Icon name="arrow-up-right" size={16} />
              </Link>
              <button
                ref={toggleRef}
                type="button"
                className="icon-btn lg:hidden"
                aria-expanded={menuOpen}
                aria-controls="mobile-sheet"
                aria-label={menuOpen ? "Menyuni yopish" : "Menyuni ochish"}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Icon name={menuOpen ? "close" : "menu"} size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* mobile sheet */}
      <div className={`sheet-backdrop ${menuOpen ? "open" : ""}`} aria-hidden="true" onClick={() => setMenuOpen(false)} />
      <div
        id="mobile-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobil menyu"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`sheet lg:hidden ${menuOpen ? "open" : ""}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="kicker">Menyu</span>
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Menyuni yopish">
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav aria-label="Mobil asosiy menyu" className="grid gap-1.5">
          {NAV_LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className="sheet-link"
              aria-current={isActive(l.href) ? "page" : undefined}
              style={{ transitionDelay: menuOpen ? `${60 + i * 40}ms` : undefined }}
            >
              {l.label}
              <Icon name="arrow-up-right" size={17} className="text-faint" />
            </Link>
          ))}
        </nav>

        <div className="mt-5 grid gap-3 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-muted">Sayt tili</span>
            <div className="flex gap-2">
              <span className="chip chip-accent !py-2">O‘zbekcha</span>
              <span className="chip !py-2 opacity-60">Русский — tez orada</span>
            </div>
          </div>
          <Link href="/contact#form" className="btn btn-primary w-full">
            Bog‘lanish
            <Icon name="arrow-up-right" size={17} />
          </Link>
          <a href={site.phone.href} className="btn btn-ghost w-full">
            <Icon name="phone" size={17} />
            {site.phone.display}
          </a>
        </div>
      </div>
    </>
  );
}
