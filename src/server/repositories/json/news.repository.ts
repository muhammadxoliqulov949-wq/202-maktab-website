import { NEWS, formatDate } from "@/data/news";
import type { NewsRepository, NewsQuery } from "@/server/repositories/interfaces";
import type { Paginated } from "@/server/types/api";

/**
 * In-memory news repository backed by the Phase 1 content module.
 * Data is loaded once at module init (no per-request file reads / parsing).
 * Phase 3: replace with a database implementation of NewsRepository.
 */
class JsonNewsRepository implements NewsRepository {
  private readonly rows = NEWS.map((n) => ({
    slug: n.slug,
    title: n.title,
    excerpt: n.excerpt,
    category: n.category,
    date: n.date,
    dateLabel: formatDate(n.date),
    readingTime: n.readingTime,
    image: n.image,
    alt: n.alt,
  }));

  private readonly bySlugIndex = new Map(NEWS.map((n) => [n.slug, n]));

  async list(q: NewsQuery): Promise<Paginated<unknown>> {
    let rows = [...this.rows];

    if (q.category) rows = rows.filter((r) => r.category === q.category);

    if (q.search) {
      const needle = q.search.toLowerCase();
      rows = rows.filter(
        (r) => r.title.toLowerCase().includes(needle) || r.excerpt.toLowerCase().includes(needle)
      );
    }

    rows.sort((a, b) => {
      if (q.sort === "date-asc") return a.date.localeCompare(b.date);
      if (q.sort === "title") return a.title.localeCompare(b.title, "uz");
      return b.date.localeCompare(a.date);
    });

    return paginate(rows, q.page, q.limit);
  }

  async bySlug(slug: string) {
    return this.bySlugIndex.get(slug) ?? null;
  }

  async slugs(): Promise<string[]> {
    return NEWS.map((n) => n.slug);
  }
}

export function paginate<T>(rows: T[], page: number, limit: number): Paginated<T> {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  return { items: rows.slice(start, start + limit), page: safePage, limit, total, totalPages };
}

export const jsonNewsRepository = new JsonNewsRepository();
