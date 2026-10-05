import type { MetadataRoute } from "next";
import { NEWS } from "@/data/news";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://202-maktab.uz";
  const routes = ["", "/about", "/education", "/ai-yordamchi", "/team", "/news", "/gallery", "/contact"];
  return [
    ...routes.map((r) => ({
      url: `${base}${r}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: r === "" ? 1 : 0.7,
    })),
    ...NEWS.map((n) => ({
      url: `${base}/news/${n.slug}`,
      lastModified: new Date(n.date),
      priority: 0.5,
    })),
  ];
}
