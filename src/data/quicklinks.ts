export type QuickLink = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
};

/** Homepage section 09 — quick access. /parents and /students are Phase-2 deep pages; for now they route to useful anchors. */
export const QUICK_LINKS: QuickLink[] = [
  {
    id: "parents",
    title: "Ota-onalar uchun",
    description: "Uchrashuvlar, maslahatlar va maktab hayotidagi o‘ringiz",
    icon: "users",
    href: "/contact#faq",
  },
  {
    id: "students",
    title: "O‘quvchilar uchun",
    description: "To‘garaklar, olimpiadalar va foydali resurslar",
    icon: "graduation",
    href: "/education#activities",
  },
  {
    id: "admission",
    title: "Qabul haqida",
    description: "Hujjatlar ro‘yxati va qabul jarayoni",
    icon: "clipboard",
    href: "/contact#form",
  },
  {
    id: "schedule",
    title: "Dars jadvali",
    description: "Smenalar va dars soatlari bo‘yicha ma’lumot",
    icon: "calendar",
    href: "/education#stages",
  },
  {
    id: "docs",
    title: "Hujjatlar",
    description: "Ustav, litsenziya va namunaviy hujjatlar",
    icon: "file",
    href: "/contact#map",
  },
  {
    id: "faq",
    title: "Savol-javoblar",
    description: "Eng ko‘p beriladigan savollarga javoblar",
    icon: "chat",
    href: "/contact#faq",
  },
];
