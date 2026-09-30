import { GALLERY } from "@/data/gallery";
import type { GalleryRepository, GalleryQuery } from "@/server/repositories/interfaces";
import { paginate } from "@/server/repositories/json/news.repository";

/**
 * Gallery metadata repository. Media binaries are served as static files
 * (CDN-friendly) — the API only returns metadata + URLs.
 */
class JsonGalleryRepository implements GalleryRepository {
  private readonly rows = GALLERY.map((g) => ({
    id: g.id,
    type: g.type,
    src: g.src,
    poster: g.poster ?? null,
    alt: g.alt,
    category: g.category,
    album: g.album,
    width: g.width,
    height: g.height,
  }));

  private readonly byIdIndex = new Map(GALLERY.map((g) => [g.id, this.rows.find((r) => r.id === g.id)!]));

  async list(q: GalleryQuery) {
    let rows = [...this.rows];
    if (q.type) rows = rows.filter((r) => r.type === q.type);
    if (q.category) {
      const needle = q.category.toLowerCase();
      rows = rows.filter((r) => r.category.toLowerCase() === needle || r.album.toLowerCase().includes(needle));
    }
    return paginate(rows, q.page, q.limit);
  }

  async byId(id: string) {
    return this.byIdIndex.get(id) ?? null;
  }
}

export const jsonGalleryRepository = new JsonGalleryRepository();
