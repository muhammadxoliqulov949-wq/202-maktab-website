import type { GalleryQuery, GalleryRepository } from "@/server/repositories/interfaces";
import type { GalleryItemDto } from "@/server/repositories/types";
import { getStore } from "@/server/repositories/store";
import { toGalleryItem } from "@/server/repositories/mappers";
import { paginate } from "@/server/repositories/json/news.repository";

/**
 * Gallery metadata repository (JSON provider). Media binaries are served as
 * static files (CDN-friendly) — the API only returns metadata + URLs.
 */
class JsonGalleryRepository implements GalleryRepository {
  async list(q: GalleryQuery): Promise<{ items: GalleryItemDto[]; page: number; limit: number; total: number; totalPages: number }> {
    let rows = getStore().gallery.filter((r) => r.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);

    if (q.type) rows = rows.filter((r) => r.type === q.type);
    if (q.category) {
      const needle = q.category.toLowerCase();
      rows = rows.filter((r) => r.category.toLowerCase() === needle || r.album.toLowerCase().includes(needle));
    }

    const page = paginate(rows, q.page, q.limit);
    return { ...page, items: page.items.map(toGalleryItem) };
  }

  async byId(id: string): Promise<GalleryItemDto | null> {
    const row = getStore().gallery.find((r) => r.id === id && r.isVisible);
    return row ? toGalleryItem(row) : null;
  }
}

export const jsonGalleryRepository = new JsonGalleryRepository();
