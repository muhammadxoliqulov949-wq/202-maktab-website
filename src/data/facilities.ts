export type Facility = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

/** Homepage section 06 — learning environment scroll story. */
export const FACILITIES: Facility[] = [
  {
    id: "classrooms",
    kicker: "01 — O‘quv xonalari",
    title: "Yorug‘ sinfxonalar",
    description:
      "Katta oynalar, qulay mebel va interaktiv taxtalar — darsda e’tibor uzoq saqlanadigan muhit. Har bir kabinet fan talabiga mos jihozlangan.",
    image: "/images/edu-classroom.jpg",
    alt: "Yorug‘ zamonaviy sinfxona",
  },
  {
    id: "sport-hall",
    kicker: "02 — Sport inshooti",
    title: "Sport zali va maydon",
    description:
      "Voleybol va basketbol uchun jihozlangan zal, ochiq futbol maydoni va jismoniy tarbiya to‘garaklari — har kuni faol harakat uchun sharoit.",
    image: "/images/edu-sport.jpg",
    alt: "Sport zali",
  },
  {
    id: "assembly",
    kicker: "03 — Akt zali",
    title: "Katta sahna zali",
    description:
      "Bayramlar, anjumanlar va ijodiy kechalar o‘tkaziladigan keng zal. O‘quvchilar sahnada o‘zini erkin his qiladi va jamoa oldida gapirishni o‘rganadi.",
    image: "/images/edu-events.jpg",
    alt: "Akt zali",
  },
  {
    id: "library",
    kicker: "04 — Kutubxona",
    title: "O‘quv va kitob zallari",
    description:
      "Darsliklar, badiiy adabiyot va o‘quvchilar uchun tinch o‘qish burchaklari. Mustaqil ta’lim olish uchun birinchi manzil.",
    image: "/images/edu-library.jpg",
    alt: "Kutubxona zali",
  },
  {
    id: "inclusive-rooms",
    kicker: "05 — Inklyuziv xonalar",
    title: "Qo‘llab-quvvatlash xonalari",
    description:
      "Maxsus ehtiyojli o‘quvchilar bilan individual va kichik guruhlarda ishlash uchun moslashtirilgan, tinch va mehribon muhit.",
    image: "/images/edu-inclusive.jpg",
    alt: "Inklyuziv ta'lim xonasi",
  },
];
