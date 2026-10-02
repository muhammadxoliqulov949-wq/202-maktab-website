import "server-only";
import type { AdminNewsRepository, AdminStatusFilter, NewsQuery, NewsRepository } from "@/server/repositories/interfaces";
import type { Paginated } from "@/server/types/api";
import type { ContentBlock, NewsArticleDto, NewsListItemDto, NewsRow } from "@/server/repositories/types";
import { supabaseAdmin } from "@/server/repositories/supabase/client";
import { dbGuard, likeSafe, meta, rangeFor } from "@/server/repositories/supabase/db";
import { toNewsArticle, toNewsListItem } from "@/server/repositories/mappers";

/**
 * Supabase PostgreSQL news repositories (public + admin).
 * Mapping notes:
 *  - `published_at` (timestamptz) → public `date` (ISO date) + `dateLabel`.
 *  - `content` jsonb holds the block array ({type: p|h|quote, text}).
 *  - `category` display name is denormalized; `category_id` is resolved
 *    best-effort on write (unknown names keep category_id = null).
 */

const COLUMNS = "id,slug,title,excerpt,content,cover_image,cover_alt,category,author_name,reading_time,is_published,published_at,archived_at,created_at,updated_at";

type DbNews = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: ContentBlock[];
  cover_image: string | null;
  cover_alt: string | null;
  category: string | null;
  author_name: string | null;
  reading_time: string | null;
  is_published: boolean;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function toRow(d: DbNews): NewsRow {
  const published = d.published_at ?? d.created_at;
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    excerpt: d.excerpt,
    category: d.category ?? "",
    date: published.slice(0, 10),
    readingTime: d.reading_time ?? "",
    image: d.cover_image ?? "",
    alt: d.cover_alt ?? "",
    body: Array.isArray(d.content) ? d.content : [],
    author: d.author_name,
    isPublished: d.is_published,
    publishedAt: d.published_at,
    archivedAt: d.archived_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function toDbInsert(r: Partial<NewsRow>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (r.slug !== undefined) db.slug = r.slug;
  if (r.title !== undefined) db.title = r.title;
  if (r.excerpt !== undefined) db.excerpt = r.excerpt;
  if (r.body !== undefined) db.content = r.body;
  if (r.category !== undefined) db.category = r.category;
  if (r.image !== undefined) db.cover_image = r.image || null;
  if (r.alt !== undefined) db.cover_alt = r.alt;
  if (r.author !== undefined) db.author_name = r.author;
  if (r.readingTime !== undefined) db.reading_time = r.readingTime || null;
  if (r.isPublished !== undefined) db.is_published = r.isPublished;
  if (r.publishedAt !== undefined) db.published_at = r.publishedAt;
  if (r.archivedAt !== undefined) db.archived_at = r.archivedAt;
  return db;
}

class SupabaseNewsRepository implements NewsRepository {
  async list(q: NewsQuery): Promise<Paginated<NewsListItemDto>> {
    const sb = supabaseAdmin();
    let sel = sb
      .from("news_articles")
      .select(COLUMNS, { count: "exact" })
      .eq("is_published", true)
      .is("archived_at", null);

    if (q.category) sel = sel.eq("category", q.category);
    if (q.search) {
      const n = likeSafe(q.search);
      if (n) sel = sel.or(`title.ilike.%${n}%,excerpt.ilike.%${n}%`);
    }
    sel = sel.order("published_at", { ascending: q.sort === "date-asc" });

    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.range(from, to);
    const rows = (dbGuard(res.error, res.data) ?? []).map(toRow);
    return { ...meta(res.count, q.page, q.limit), items: rows.map(toNewsListItem) };
  }

  async bySlug(slug: string): Promise<NewsArticleDto | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("news_articles")
      .select(COLUMNS)
      .eq("slug", slug)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    dbGuard(error, data);
    return data ? toNewsArticle(toRow(data as DbNews)) : null;
  }

  async slugs(): Promise<string[]> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("news_articles").select("slug").eq("is_published", true).is("archived_at", null);
    dbGuard(error, data);
    return ((data as Array<{ slug: string }> | null) ?? []).map((r) => r.slug);
  }
}

class SupabaseAdminNewsRepository implements AdminNewsRepository {
  async list(q: { search?: string; category?: string; status: AdminStatusFilter; page: number; limit: number }): Promise<Paginated<NewsRow>> {
    const sb = supabaseAdmin();
    let sel = sb.from("news_articles").select(COLUMNS, { count: "exact" });
    if (q.status === "all") sel = sel.is("archived_at", null);
    if (q.status === "published") sel = sel.eq("is_published", true).is("archived_at", null);
    if (q.status === "draft") sel = sel.eq("is_published", false).is("archived_at", null);
    if (q.status === "archived") sel = sel.not("archived_at", "is", null);
    if (q.category) sel = sel.eq("category", q.category);
    if (q.search) {
      const n = likeSafe(q.search);
      if (n) sel = sel.or(`title.ilike.%${n}%,slug.ilike.%${n}%`);
    }
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("created_at", { ascending: false }).range(from, to);
    const rows = ((res.data as DbNews[] | null) ?? []).map(toRow);
    return { ...meta(res.count, q.page, q.limit), items: rows };
  }

  async byId(id: string): Promise<NewsRow | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("news_articles").select(COLUMNS).eq("id", id).maybeSingle();
    dbGuard(error, data);
    return data ? toRow(data as DbNews) : null;
  }

  async bySlug(slug: string): Promise<NewsRow | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("news_articles").select(COLUMNS).eq("slug", slug).maybeSingle();
    dbGuard(error, data);
    return data ? toRow(data as DbNews) : null;
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const sb = supabaseAdmin();
    let sel = sb.from("news_articles").select("id").eq("slug", slug).limit(1);
    if (excludeId) sel = sel.neq("id", excludeId);
    const { data, error } = await sel;
    dbGuard(error, data);
    return ((data as Array<{ id: string }> | null) ?? []).length > 0;
  }

  async create(row: NewsRow): Promise<NewsRow> {
    const sb = supabaseAdmin();
    const category_id = await resolveCategoryId(row.category);
    const insert = { ...toDbInsert(row), category_id };
    const { data, error } = await sb.from("news_articles").insert(insert).select(COLUMNS).single();
    return toRow(dbGuard(error, data) as DbNews);
  }

  async update(id: string, patch: Partial<NewsRow>): Promise<NewsRow | null> {
    const sb = supabaseAdmin();
    const db = toDbInsert(patch);
    if (patch.category !== undefined) db.category_id = await resolveCategoryId(patch.category);
    const { data, error } = await sb.from("news_articles").update(db).eq("id", id).select(COLUMNS).maybeSingle();
    dbGuard(error, data);
    return data ? toRow(data as DbNews) : null;
  }

  async setStatus(id: string, patch: { isPublished?: boolean; publishedAt?: string | null; archivedAt?: string | null }): Promise<NewsRow | null> {
    return this.update(id, patch);
  }

  async remove(id: string): Promise<boolean> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("news_articles").delete().eq("id", id).select("id");
    dbGuard(error, data);
    return ((data as Array<{ id: string }> | null) ?? []).length > 0;
  }

  async categories(): Promise<string[]> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("news_categories").select("name").order("sort_order");
    dbGuard(error, data);
    return ((data as Array<{ name: string }> | null) ?? []).map((r) => r.name);
  }
}

async function resolveCategoryId(name: string | undefined): Promise<string | null> {
  if (!name) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("news_categories").select("id").eq("name", name).maybeSingle();
  dbGuard(error, data);
  return (data as { id: string } | null)?.id ?? null;
}

export const supabaseNewsRepository = new SupabaseNewsRepository();
export const supabaseAdminNewsRepository = new SupabaseAdminNewsRepository();
