export type LifeItem = {
  id: string;
  category: string;
  title: string;
  image: string;
  alt: string;
  /** aspect ratio for the editorial mosaic */
  ratio: "tall" | "wide" | "square";
};

export const LIFE_CATEGORIES = [
  "Darslar",
  "Sport",
  "Kutubxona",
  "Tadbirlar",
  "Ijod",
  "Maktab muhiti",
] as const;

/** Homepage section 05 — immersive school life mosaic. PROTOTYPE imagery. */
export const LIFE_ITEMS: LifeItem[] = [
  {
    id: "darslar",
    category: "Darslar",
    title: "Har bir darsda yangi kashfiyot",
    image: "/images/edu-quality.jpg",
    alt: "Sinfxonada dars jarayoni",
    ratio: "tall",
  },
  {
    id: "sport",
    category: "Sport",
    title: "Maydonda do‘stlik va harakat",
    image: "/images/life-sport.jpg",
    alt: "Maktab maydonchasida sport o‘yini",
    ratio: "wide",
  },
  {
    id: "ijod",
    category: "Ijod",
    title: "Ijod erkinligi va san’at",
    image: "/images/life-ijod.jpg",
    alt: "Ijodiy to‘garak xonasi",
    ratio: "square",
  },
  {
    id: "muhit",
    category: "Maktab muhiti",
    title: "Yashil va bag‘rikeng maktab hovlisi",
    image: "/images/intro.jpg",
    alt: "Maktab ichki hovlisi",
    ratio: "tall",
  },
  {
    id: "kutubxona",
    category: "Kutubxona",
    title: "Kitob olamiga sayohat",
    image: "/images/edu-library.jpg",
    alt: "Kutubxonada o‘quv zali",
    ratio: "wide",
  },
  {
    id: "tadbirlar",
    category: "Tadbirlar",
    title: "Katta sahna, katta his-tuyg‘ular",
    image: "/images/edu-events.jpg",
    alt: "Akt zali sahnasi",
    ratio: "square",
  },
];
