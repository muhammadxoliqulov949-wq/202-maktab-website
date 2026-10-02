export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Bosh sahifa" },
  { href: "/about", label: "Maktab haqida" },
  { href: "/education", label: "Ta’lim" },
  { href: "/team", label: "Jamoa" },
  { href: "/news", label: "Yangiliklar" },
  { href: "/gallery", label: "Galereya" },
  { href: "/contact", label: "Aloqa" },
];

export const FOOTER_LINKS: NavLink[] = [
  { href: "/about", label: "Maktab haqida" },
  { href: "/education", label: "Ta’lim" },
  { href: "/team", label: "Jamoa" },
  { href: "/news", label: "Yangiliklar" },
  { href: "/gallery", label: "Galereya" },
  { href: "/contact", label: "Aloqa" },
];

export const USEFUL_LINKS: NavLink[] = [
  { href: "/about", label: "Ota-onalar uchun" },
  { href: "/education#activities", label: "O‘quvchilar uchun" },
  { href: "/contact#faq", label: "Savol-javoblar" },
  { href: "/contact#form", label: "Hujjatlar" },
];
