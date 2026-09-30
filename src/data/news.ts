export type NewsCategory = "Yangiliklar" | "Tadbirlar" | "Sport" | "Tanlovlar" | "Ochiq darslar";

export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: NewsCategory;
  date: string; // ISO
  readingTime: string;
  image: string;
  alt: string;
  /** simple rich content blocks — replaced by DB content in Phase 3 */
  body: Array<{ type: "p" | "h" | "quote"; text?: string }>;
};

export const NEWS_CATEGORIES: NewsCategory[] = ["Yangiliklar", "Tadbirlar", "Sport", "Tanlovlar", "Ochiq darslar"];

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** PROTOTYPE news — sample editorial content for layout demo. */
export const NEWS: NewsArticle[] = [
  {
    slug: "yangi-oquv-yili-2026",
    title: "Yangi o‘quv yili 2026–2027: birga katta maqsadlar sari",
    excerpt:
      "1-sentabr — bilim bayrami. Bu yil maktabimizda yangi o‘quvchilar, yangi loyihalar va yangi imkoniyatlar bilan kutilmoqda.",
    category: "Yangiliklar",
    date: iso(2026, 9, 1),
    readingTime: "3 daqiqa",
    image: "/images/hero.jpg",
    alt: "Maktab binosi bayram kuni",
    body: [
      { type: "h", text: "Bayram tongi" },
      {
        type: "p",
        text: "202-maktab hovlisida 1-sentabr tongi yana bir bor bilim bayramiga aylandi. Birinchi sinf o‘quvchilarini katta hurmat bilan kutib olishdik — ustozlar va katta o‘quvchilar ularni gulchambarlar bilan kutib oldi.",
      },
      { type: "quote", text: "Har bir o‘quv yili — yangi sahifa. Biz u sahifalarga birgalikda yozamiz." },
      { type: "h", text: "Yangi loyihalar" },
      {
        type: "p",
        text: "Yangi o‘quv yilida fan to‘garaklari, sport musobaqalari va ijodiy loyihalar yanada kengayadi. Ota-onalar uchun axborot uchrashuvlari jadvali maktab kanalida e’lon qilinadi.",
      },
      {
        type: "p",
        text: "Barcha o‘quvchi, ustoz va ota-onalarga sog‘lom, omadli va barakali o‘quv yili tilaymiz!",
      },
    ],
  },
  {
    slug: "ota-onalar-uchun-ochiq-eshiklar-kuni",
    title: "Ota-onalar uchun ochiq eshiklar kuni",
    excerpt:
      "Sentabr oyi davomida ota-onalar maktabga tashrif buyurib, sinfxonalar bilan tanishishi va ustozlar bilan uchrashishi mumkin.",
    category: "Tadbirlar",
    date: iso(2026, 9, 18),
    readingTime: "2 daqiqa",
    image: "/images/news-open-door.jpg",
    alt: "Ota-onalar maktab koridorida",
    body: [
      { type: "p", text: "Ochiq eshiklar kuni — ota-onalar uchun maktab hayotini ichidan ko‘rish imkoniyati. Tashrif davomida sinfxonalar, sport zali va kutubxona bilan tanishasiz." },
      { type: "p", text: "Aniq sana va vaqt maktab rasmiy kanallarida e’lon qilinadi. Keling, birgalikda o‘quvchilarimiz kelajagini quramiz." },
    ],
  },
  {
    slug: "fan-olimpiadalari-bosqichi",
    title: "Fan olimpiadalarining tuman bosqichi boshlanmoqda",
    excerpt:
      "Matematika, fizika va ona tili fani olimpiadalari uchun maktab bosqichi yakunlandi. G‘oliblar tuman bosqichiga yo‘l oldi.",
    category: "Tanlovlar",
    date: iso(2026, 9, 24),
    readingTime: "2 daqiqa",
    image: "/images/news-olympiad.jpg",
    alt: "Olimpiada medallari",
    body: [
      { type: "p", text: "Maktab bosqichida yuzlab o‘quvchilar qatnashdi. Eng yaxshi natijalarni ko‘rsatgan o‘quvchilar tuman bosqichida maktabimiz sharafini himoya qiladi." },
      { type: "quote", text: "Olimpiada — bu faqat musobaqa emas, bu intellektual bayram." },
      { type: "p", text: "Barcha qatnashchilarga omad tilaymiz!" },
    ],
  },
  {
    slug: "robototexnika-togarak-qabul",
    title: "Robototexnika va STEM to‘garaklariga qabul boshlandi",
    excerpt:
      "Boshlang‘ich va o‘rta sinf o‘quvchilari uchun yangi STEM to‘garaklari ochiladi. Joylar soni cheklangan.",
    category: "Yangiliklar",
    date: iso(2026, 10, 2),
    readingTime: "2 daqiqa",
    image: "/images/edu-classroom.jpg",
    alt: "Robototexnika to'garagi uchun zamonaviy sinfxona",
    body: [
      { type: "p", text: "STEM ta’limi — muhandislik va texnologiyaga qiziqqan bolalar uchun birinchi qadam. To‘garakda o‘quvchilar oddiy robotlar yasashni va dasturlash asoslarini o‘rganadi." },
      { type: "p", text: "Ro‘yxatdan o‘tish uchun sinf rahbaringizga murojaat qiling." },
    ],
  },
  {
    slug: "maktab-spogatki-yakuni",
    title: "Maktab sporti: kuzgi spartakiada yakunlandi",
    excerpt:
      "Futbol, voleybol va shaxmat bo‘yicha sinflar o‘rtasidagi musobaqalar muhim natijalar bilan yakunlandi.",
    category: "Sport",
    date: iso(2026, 10, 15),
    readingTime: "3 daqiqa",
    image: "/images/life-sport.jpg",
    alt: "Maktab maydonchasida futbol",
    body: [
      { type: "p", text: "Kuzgi spartakiada ikki hafta davom etdi. Barcha sinflar faol qatnashdi — maydonda do‘stlik va kurash ruhi qaynadi." },
      { type: "p", text: "G‘olib sinflar maktab qiroysida taqdirlandi. Barcha ishtirokchilarga rahmat!" },
    ],
  },
  {
    slug: "ochiq-darslar-haftaligi",
    title: "Ochiq darslar haftaligi: ustozlar tajribasi ulashmoqda",
    excerpt:
      "Maktabimizda ochiq darslar haftaligi o‘tkaziladi — ota-onalar va kollega ustozlar darslarni kuzatishi mumkin.",
    category: "Ochiq darslar",
    date: iso(2026, 11, 5),
    readingTime: "2 daqiqa",
    image: "/images/edu-quality.jpg",
    alt: "Ochiq dars jarayoni",
    body: [
      { type: "p", text: "Ochiq darslar — pedagogik mahoratni oshirish va shaffoflik uchun muhim an’ana. Bu haftada bir nechta ustozlar darslarini ochiq o‘tadi." },
      { type: "p", text: "Qatnashish uchun oldindan ro‘yxatdan o‘tish talab etiladi." },
    ],
  },
];

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const months = [
    "yanvar", "fevral", "mart", "aprel", "may", "iyun",
    "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
  ];
  return `${d} ${months[(m ?? 1) - 1]}, ${y}`;
}

export function getArticle(slug: string): NewsArticle | undefined {
  return NEWS.find((n) => n.slug === slug);
}

export function relatedArticles(slug: string, count = 2): NewsArticle[] {
  return NEWS.filter((n) => n.slug !== slug).slice(0, count);
}
