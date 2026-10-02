import type { NewsQuery, NewsRepository, AdminNewsRepository, AdminStatusFilter } from "@/server/repositories/interfaces";
import type { Paginated } from "@/server/types/api";
import type { NewsListItemDto, NewsArticleDto, NewsRow } from "@/server/repositories/types";
import { getStore } from "@/server/repositories/store";
import { toNewsArticle, toNewsListItem } from "@/server/repositories/mappers";

/**
 * JSON-provider news repositories (public + admin) over the in-memory store.
 * Public repo enforces the draft/archive separation: only published,
 * non-archived rows are visible.
 */

export function paginate<T>(rows: T[], page: number, limit: number): Paginated<T> {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  return { items: rows.slice(start, start + limit), page: safePage, limit, total, totalPages };
}

function visible(): NewsRow[] {
  return getStore().news.filter((n) => n.isPublished && !n.archivedAt);
}

class JsonNewsRepository implements NewsRepository {
  async list(q: NewsQuery): Promise<Paginated<NewsListItemDto>> {
    let rows = visible();

    if (q.category) rows = rows.filter((r) => r.category === q.category);

    if (q.search) {
      const needle = q.search.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(needle) || r.excerpt.toLowerCase().includes(needle));
    }

    rows.sort((a, b) => {
      if (q.sort === "date-asc") return a.date.localeCompare(b.date);
      if (q.sort === "title") return a.title.localeCompare(b.title, "uz");
      return b.date.localeCompare(a.date);
    });

    return paginate(rows.map(toNewsListItem), q.page, q.limit);
  }

  async bySlug(slug: string): Promise<NewsArticleDto | null> {
    const row = visible().find((r) => r.slug === slug);
    return row ? toNewsArticle(row) : null;
  }

  async slugs(): Promise<string[]> {
    return visible().map((r) => r.slug);
  }
}

export const jsonNewsRepository = new JsonNewsRepository();

class JsonAdminNewsRepository implements AdminNewsRepository {
  async list(q: { search?: string; category?: string; status: AdminStatusFilter; page: number; limit: number }): Promise<Paginated<NewsRow>> {
    let rows = [...getStore().news];
    if (q.status === "published") rows = rows.filter((r) => r.isPublished && !r.archivedAt);
    if (q.status === "draft") rows = rows.filter((r) => !r.isPublished && !r.archivedAt);
    if (q.status === "archived") rows = rows.filter((r) => Boolean(r.archivedAt));
    if (q.status === "all") rows = rows.filter((r) => !r.archivedAt);
    if (q.category) rows = rows.filter((r) => r.category === q.category);
    if (q.search) {
      const needle = q.search.toLowerCase();
      rows = rows.filter((r) => r.title.toLowerCase().includes(needle) || r.slug.includes(needle));
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate(rows, q.page, q.limit);
  }

  async byId(id: string) {
    return getStore().news.find((r) => r.id === id) ?? null;
  }

  async bySlug(slug: string) {
    return getStore().news.find((r) => r.slug === slug) ?? null;
  }

  async slugExists(slug: string, excludeId?: string) {
    return getStore().news.some((r) => r.slug === slug && r.id !== excludeId);
  }

  async create(row: NewsRow) {
    getStore().news.unshift(row);
    return row;
  }

  async update(id: string, patch: Partial<NewsRow>) {
    const row = getStore().news.find((r) => r.id === id);
    if (!row) return null;
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    return row;
  }

  async setStatus(id: string, patch: { isPublished?: boolean; publishedAt?: string | null; archivedAt?: string | null }) {
    return this.update(id, patch);
  }

  async remove(id: string) {
    const store = getStore();
    const i = store.news.findIndex((r) => r.id === id);
    if (i === -1) return false;
    store.news.splice(i, 1);
    return true;
  }

  async categories() {
    return [...getStore().newsCategories];
  }
}

export const jsonAdminNewsRepository = new JsonAdminNewsRepository();
