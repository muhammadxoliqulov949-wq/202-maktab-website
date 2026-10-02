export type GalleryCategory = "Darslar" | "Sport" | "Kutubxona" | "Tadbirlar" | "Ijod" | "Maktab muhiti";

export type GalleryItem = {
  id: string;
  type: "image" | "video";
  src: string;
  poster?: string; // for videos
  alt: string;
  category: GalleryCategory;
  album: string;
  width: number;
  height: number;
};

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  "Darslar",
  "Sport",
  "Kutubxona",
  "Tadbirlar",
  "Ijod",
  "Maktab muhiti",
];

/**
 * Gallery — PROTOTYPE media. All imagery is temporary placeholder material,
 * NOT actual School 202 photographs. Replaced by real assets in Phase 5.
 */
export const GALLERY: GalleryItem[] = [
  { id: "g-01", type: "image", src: "/images/hero.jpg", alt: "Maktab binosi tashqaridan", category: "Maktab muhiti", album: "Binolar", width: 1792, height: 1008 },
  { id: "g-02", type: "image", src: "/images/intro.jpg", alt: "Maktab koridori", category: "Maktab muhiti", album: "Binolar", width: 1024, height: 1280 },
  { id: "g-03", type: "image", src: "/images/edu-classroom.jpg", alt: "Zamonaviy sinfxona", category: "Darslar", album: "Sinfxonalar", width: 1024, height: 768 },
  { id: "g-04", type: "image", src: "/images/edu-quality.jpg", alt: "Dars jarayoni", category: "Darslar", album: "Sinfxonalar", width: 1536, height: 1024 },
  { id: "g-05", type: "image", src: "/images/edu-sport.jpg", alt: "Sport zali", category: "Sport", album: "Sport", width: 1536, height: 1024 },
  { id: "g-06", type: "image", src: "/images/life-sport.jpg", alt: "Ochiq maydonda futbol", category: "Sport", album: "Sport", width: 1536, height: 1024 },
  { id: "g-07", type: "image", src: "/images/edu-library.jpg", alt: "Kutubxona", category: "Kutubxona", album: "Kutubxona", width: 1536, height: 1024 },
  { id: "g-08", type: "image", src: "/images/edu-events.jpg", alt: "Akt zali", category: "Tadbirlar", album: "Tadbirlar", width: 1792, height: 1008 },
  { id: "g-09", type: "image", src: "/images/life-ijod.jpg", alt: "Ijodiy to‘garak", category: "Ijod", album: "Ijod", width: 1536, height: 1024 },
  { id: "g-10", type: "image", src: "/images/edu-inclusive.jpg", alt: "Inklyuziv ta’lim xonasi", category: "Darslar", album: "Sinfxonalar", width: 1024, height: 768 },
  { id: "g-11", type: "image", src: "/images/life-muhit.jpg", alt: "Yashil maktab hovlisi", category: "Maktab muhiti", album: "Hovli", width: 1024, height: 1280 },
  { id: "v-01", type: "video", src: "/video/campus.mp4", poster: "/images/hero.jpg", alt: "Maktab binosi video lavhasi", category: "Maktab muhiti", album: "Video", width: 1792, height: 1008 },
  { id: "v-02", type: "video", src: "/video/sport.mp4", poster: "/images/life-sport.jpg", alt: "Sport maydoni video lavhasi", category: "Sport", album: "Video", width: 1792, height: 1008 },
];

export const GALLERY_ALBUMS = ["Barcha albomlar", ...Array.from(new Set(GALLERY.map((g) => g.album)))];
