export type Value = { id: string; title: string; description: string; icon: string };

export const VALUES: Value[] = [
  {
    id: "knowledge",
    title: "Bilim",
    description: "Chuqur va amaliy ta’lim — har bir fan hayotiy ko‘nikma bilan bog‘lanadi.",
    icon: "book",
  },
  {
    id: "care",
    title: "G‘amxo‘rlik",
    description: "Har bir bola shaxs sifatida qadrlanadi; xavfsiz va mehribon muhit asosiy shart.",
    icon: "heart",
  },
  {
    id: "respect",
    title: "Hurmat",
    description: "O‘quvchi, ustoz va ota-ona o‘rtasidagi ochiq va halol muloqot madaniyati.",
    icon: "handshake",
  },
  {
    id: "growth",
    title: "Rivojlanish",
    description: "Ustozlar uchun uzluksiz malaka oshirish, o‘quvchilar uchun uzluksiz ilgorlik.",
    icon: "trend",
  },
];

/** Timeline — PROTOTYPE structure. Dates/events intentionally neutral; real history arrives in Phase 5. */
export const TIMELINE = [
  {
    id: "t1",
    period: "Tashkil topgan",
    title: "Maktab tarixining boshlanishi",
    description: "Maktab o‘z faoliyatini Chilonzor tumanida boshlagan. Aniq sana va tarixiy ma’lumotlar rasmiy arxivdan kelganda joylanadi.",
  },
  {
    id: "t2",
    period: "Keyingi bosqich",
    title: "Binoning kengaytirilishi",
    description: "O‘quv binosi va inshootlar rivoji haqidagi tasdiqlangan ma’lumotlar keyingi bosqichda e’lon qilinadi.",
  },
  {
    id: "t3",
    period: "Bugungi kun",
    title: "Zamonaviy ta’lim maskani",
    description: "Bugun maktab 1–11-sinflar, katta pedagoglar jamoasi va keng imkoniyatlar bilan faoliyat yuritadi.",
  },
];
