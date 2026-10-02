import "server-only";
import type { AdminReorderableRepository, GalleryQuery, GalleryRepository } from "@/server/repositories/interfaces";
import type { GalleryItemDto, GalleryRow } from "@/server/repositories/types";
import { supabaseAdmin } from "@/server/repositories/supabase/client";
import { dbGuard, likeSafe, meta, rangeFor } from "@/server/repositories/supabase/db";
import { toGalleryItem } from "@/server/repositories/mappers";

const COLUMNS = "id,type,src,poster,alt,caption,external_url,category,album,width,height,sort_order,is_visible,created_at,updated_at";

type DbGallery = {
  id: string;
  type: "image" | "video";
  src: string;
  poster: string | null;
  alt: string | null;
  caption: string | null;
  external_url: string | null;
  category: string | null;
  album: string | null;
  width: number;
  height: number;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

function toRow(d: DbGallery): GalleryRow {
  return {
    id: d.id,
    type: d.type,
    src: d.src,
    poster: d.poster,
    alt: d.alt ?? "",
    category: d.category ?? "",
    album: d.album ?? "",
    width: d.width,
    height: d.height,
    caption: d.caption,
    externalUrl: d.external_url,
    sortOrder: d.sort_order,
    isVisible: d.is_visible,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function toDb(r: Partial<GalleryRow>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (r.type !== undefined) db.type = r.type;
  if (r.src !== undefined) db.src = r.src;
  if (r.poster !== undefined) db.poster = r.poster;
  if (r.alt !== undefined) db.alt = r.alt;
  if (r.caption !== undefined) db.caption = r.caption;
  if (r.externalUrl !== undefined) db.external_url = r.externalUrl;
  if (r.category !== undefined) db.category = r.category;
  if (r.album !== undefined) db.album = r.album;
  if (r.width !== undefined) db.width = r.width;
  if (r.height !== undefined) db.height = r.height;
  if (r.sortOrder !== undefined) db.sort_order = r.sortOrder;
  if (r.isVisible !== undefined) db.is_visible = r.isVisible;
  return db;
}

class SupabaseGalleryRepository implements GalleryRepository {
  async list(q: GalleryQuery): Promise<{ items: GalleryItemDto[]; page: number; limit: number; total: number; totalPages: number }> {
    const sb = supabaseAdmin();
    let sel = sb.from("gallery_items").select(COLUMNS, { count: "exact" }).eq("is_visible", true);
    if (q.type) sel = sel.eq("type", q.type);
    if (q.category) {
      const n = likeSafe(q.category);
      if (n) sel = sel.or(`category.ilike.%${n}%,album.ilike.%${n}%`);
    }
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("sort_order").range(from, to);
    const rows = (dbGuard(res.error, res.data) as DbGallery[] | null ?? []).map(toRow);
    return { ...meta(res.count, q.page, q.limit), items: rows.map(toGalleryItem) };
  }

  async byId(id: string): Promise<GalleryItemDto | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("gallery_items").select(COLUMNS).eq("id", id).eq("is_visible", true).maybeSingle();
    dbGuard(error, data);
    return data ? toGalleryItem(toRow(data as DbGallery)) : null;
  }
}

class SupabaseAdminGalleryRepository implements AdminReorderableRepository<GalleryRow> {
  async list(q: { search?: string; status?: "all" | "visible" | "hidden"; page: number; limit: number }) {
    const sb = supabaseAdmin();
    let sel = sb.from("gallery_items").select(COLUMNS, { count: "exact" });
    if (q.status === "visible") sel = sel.eq("is_visible", true);
    if (q.status === "hidden") sel = sel.eq("is_visible", false);
    if (q.search) {
      const n = likeSafe(q.search);
      if (n) sel = sel.or(`alt.ilike.%${n}%,album.ilike.%${n}%,category.ilike.%${n}%`);
    }
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("sort_order").range(from, to);
    const rows = (dbGuard(res.error, res.data) as DbGallery[] | null ?? []).map(toRow);
    return { ...meta(res.count, q.page, q.limit), items: rows };
  }

  async byId(id: string) {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("gallery_items").select(COLUMNS).eq("id", id).maybeSingle();
    dbGuard(error, data);
    return data ? toRow(data as DbGallery) : null;
  }

  async create(row: GalleryRow) {
    const sb = supabaseAdmin();
    const category_id = await resolveCategoryId(row.category);
    const { data, error } = await sb
      .from("gallery_items")
      .insert({ ...toDb(row), category_id })
      .select(COLUMNS)
      .single();
    return toRow(dbGuard(error, data) as DbGallery);
  }

  async update(id: string, patch: Partial<GalleryRow>) {
    const sb = supabaseAdmin();
    const db = toDb(patch);
    if (patch.category !== undefined) db.category_id = await resolveCategoryId(patch.category);
    const { data, error } = await sb.from("gallery_items").update(db).eq("id", id).select(COLUMNS).maybeSingle();
    dbGuard(error, data);
    return data ? toRow(data as DbGallery) : null;
  }

  async remove(id: string) {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("gallery_items").delete().eq("id", id).select("id");
    dbGuard(error, data);
    return ((data as Array<{ id: string }> | null) ?? []).length > 0;
  }

  async reorder(orderedIds: string[]) {
    const sb = supabaseAdmin();
    const { error } = await sb.from("gallery_items").upsert(orderedIds.map((id, i) => ({ id, sort_order: i })), { onConflict: "id" });
    dbGuard(error, true);
    return true;
  }
}

async function resolveCategoryId(name: string | undefined): Promise<string | null> {
  if (!name) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb.from("gallery_categories").select("id").eq("name", name).maybeSingle();
  dbGuard(error, data);
  return (data as { id: string } | null)?.id ?? null;
}

export const supabaseGalleryRepository = new SupabaseGalleryRepository();
export const supabaseAdminGalleryRepository = new SupabaseAdminGalleryRepository();
