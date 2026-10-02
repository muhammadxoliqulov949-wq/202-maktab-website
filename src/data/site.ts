/**
 * Global site identity & contact data.
 * PROTOTYPE: phone/email/map values are placeholders — verified data arrives in Phase 5.
 */
export const site = {
  name: "202-maktab",
  fullName: "202-sonli umumiy o‘rta ta’lim maktabi",
  tagline: "Bilim, tarbiya va kelajak bir maskanda.",
  district: "Toshkent shahri • Chilonzor tumani",
  address: "Chilonzor tumani, Toshkent shahri, O‘zbekiston",
  phone: {
    display: "+998 (71) 000-00-00",
    href: "tel:+998710000000",
  },
  mobile: {
    display: "+998 (90) 000-00-00",
    href: "tel:+998900000000",
  },
  email: {
    display: "info@202-maktab.uz",
    href: "mailto:info@202-maktab.uz",
  },
  hours: [
    { days: "Dushanba – Shanba", time: "08:00 – 15:00" },
    { days: "Yakshanba", time: "Dam olish kuni" },
  ],
  /** Prototype map (Chilonzor approximate area). Replaced with the verified location in Phase 5. */
  map: {
    embed:
      "https://www.openstreetmap.org/export/embed.html?bbox=69.2054%2C41.2597%2C69.2754%2C41.2997&layer=mapnik&marker=41.2797%2C69.2404",
    route: "https://www.google.com/maps/search/?api=1&query=41.2797%2C69.2404",
    view: "https://www.openstreetmap.org/?mlat=41.2797&mlon=69.2404#map=15/41.2797/69.2404",
  },
  social: {
    telegram: "https://t.me/202maktab",
    instagram: "https://instagram.com/202maktab",
  },
  established: "19XX",
} as const;

export const PROTOTYPE_NOTE =
  "Prototip: ushbu bo‘limdagi ma’lumotlar namunaviy. Tekshirilgan rasmiy ma’lumotlar 5-bosqichda joylanadi.";
