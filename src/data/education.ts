export type EduFeature = {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: string;
  image?: string;
  alt?: string;
};

/** Homepage — education experience tiles (01–06). */
export const EDU_FEATURES: EduFeature[] = [
  {
    id: "quality",
    index: "01",
    title: "Sifatli ta’lim",
    description:
      "Davlat standartiga asoslangan, ammo har bir o‘quvchining qiziqishi va temposiga moslashadigan dars tizimi.",
    icon: "book",
  },
  {
    id: "classrooms",
    index: "02",
    title: "Zamonaviy sinfxonalar",
    description:
      "Yorug‘, shinam sinfxonalar, interaktiv uskunalar va fan kabinetlari — qulay muhitda chuqur o‘zlashtirish uchun.",
    icon: "monitor",
    image: "/images/edu-classroom.jpg",
    alt: "Zamonaviy sinfxona interyeri",
  },
  {
    id: "sport",
    index: "03",
    title: "Sport va rivojlanish",
    description:
      "Sport zali, ochiq maydon va to‘garaklar — sog‘lom tanada sog‘lom aql tamoyili asosida jismoniy tarbiya.",
    icon: "ball",
    image: "/images/edu-sport.jpg",
    alt: "Maktab sport zali",
  },
  {
    id: "library",
    index: "04",
    title: "Kutubxona",
    description:
      "O‘quv adabiyotlari, badiiy kitoblar va o‘quv zallari — mustaqil o‘qish va tadqiqot ko‘nikmalarini shakllantirish uchun.",
    icon: "library",
    image: "/images/edu-library.jpg",
    alt: "Maktab kutubxonasi",
  },
  {
    id: "inclusive",
    index: "05",
    title: "Inklyuziv ta’lim",
    description:
      "Maxsus ehtiyojli o‘quvchilar uchun moslashtirilgan dasturlar, resurslar va malakali mutaxassislar yordami.",
    icon: "heart",
    image: "/images/edu-inclusive.jpg",
    alt: "Inklyuziv ta'lim xonasi",
  },
  {
    id: "events",
    index: "06",
    title: "Tadbirlar va maktab hayoti",
    description:
      "Bayramlar, tanlovlar, olimpiadalar va ijodiy kechalar — o‘quvchilar o‘z qobiliyatlarini namoyish etadigan maydon.",
    icon: "star",
    image: "/images/edu-events.jpg",
    alt: "Maktab akt zali",
  },
];
