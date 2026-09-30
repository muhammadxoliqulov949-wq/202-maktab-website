export type Stage = {
  id: string;
  grades: string;
  title: string;
  description: string;
  highlights: string[];
};

export const STAGES: Stage[] = [
  {
    id: "primary",
    grades: "1–4",
    title: "Boshlang‘ich ta’lim",
    description:
      "O‘qish, yozish, hisoblash asoslari va birinchi ustoz bilan ishonchli munosabat — kichik yoshdagi bolaning maktabga muhabbatini shakllantiruvchi bosqich.",
    highlights: ["Birinchi ustoz tizimi", "O‘yin asosidagi faol darslar", "Suvnat va qiziqishni rivojlantirish"],
  },
  {
    id: "middle",
    grades: "5–9",
    title: "Umumiy o‘rta ta’lim",
    description:
      "Fanlar chuqurlashadi: aniq, tabiiy va gumanitar yo‘nalishlar, til va informatika kundalik amaliyotga aylanadi.",
    highlights: ["Fan kabinetlari va amaliyot", "Olimpiadalar va tanlovlar", "To‘garaklar va loyihalar"],
  },
  {
    id: "high",
    grades: "10–11",
    title: "O‘rta ta’lim va kasbga yo‘naltirish",
    description:
      "Bitiruv bosqichi — oliy ta’lim va kasb tanlashga tayyorgarlik, kuchli fan bloklari va individual maslahatlar.",
    highlights: ["Kasb tanlash maslahatlari", "Imtihonga tayyorgarlik", "Karyera kunlari"],
  },
];

export const SUBJECT_GROUPS = [
  {
    id: "exact",
    title: "Aniq fanlar",
    items: ["Matematika", "Fizika", "Kimyo", "Biologiya", "Informatika", "Geografiya"],
    icon: "atom",
  },
  {
    id: "languages",
    title: "Til va gumanitar fanlar",
    items: ["Ona tili va adabiyot", "O‘zbek adabiyoti", "Ingliz tili", "Rus tili", "Tarix", "Huquq asoslari"],
    icon: "globe",
  },
  {
    id: "arts",
    title: "San’at va jismoniy tarbiya",
    items: ["Tasviriy san’at", "Musiqa", "Jismoniy tarbiya", "Texnologiya", "Chizmachilik"],
    icon: "palette",
  },
];

export const METHOD_POINTS = [
  {
    id: "m1",
    title: "O‘quvchi markazda",
    description: "Dars savol bilan boshlanadi: o‘quvchi o‘ylaydi, sinab ko‘radi va xulosa qiladi.",
  },
  {
    id: "m2",
    title: "Amaliyot va loyihalar",
    description: "Nazariya darhol amaliy topshiriq, laboratoriya yoki guruh loyihasi bilan mustahkamlanadi.",
  },
  {
    id: "m3",
    title: "Baholash — rivojlanish uchun",
    description: "Baholar faqat nazorat uchun emas: o‘quvchining o‘sish yo‘li kuzatiladi va qo‘llab-quvvatlanadi.",
  },
  {
    id: "m4",
    title: "Raqamli ko‘nikmalar",
    description: "Informatika va interaktiv vositalar barcha fanlar bo‘yicha kundalik qurolga aylanadi.",
  },
];

export const ACTIVITIES = [
  { id: "a1", title: "Sport to‘garaklari", description: "Futbol, voleybol, basketbol va shaxmat bo‘limlari." },
  { id: "a2", title: "Ijodiy studiyalar", description: "Tasviriy san’at, musiqa va vokal, raqs." },
  { id: "a3", title: "Fan olimpiadalari", description: "Matematika, fizika, ona tili va boshqa fanlar bo‘yicha." },
  { id: "a4", title: "Robototexnika va STEM", description: "Dasturlash, robotlar yasash va muhandislik topshiriqlari." },
  { id: "a5", title: "Mahalla va ekologiya", description: "«Yashil maktab» tashabbuslari va jamoat loyihalari." },
  { id: "a6", title: "Premyeralar va kechalar", description: "Teatr, adabiy kechalar va bayram tadbirlari." },
];
