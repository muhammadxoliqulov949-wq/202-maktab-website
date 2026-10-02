import "server-only";
import type { AdminReorderableRepository, TeamQuery, TeamRepository } from "@/server/repositories/interfaces";
import type { TeamItemDto, TeamListItemDto, TeamRow } from "@/server/repositories/types";
import { supabaseAdmin } from "@/server/repositories/supabase/client";
import { dbGuard, likeSafe, meta, rangeFor } from "@/server/repositories/supabase/db";
import { toTeamItem, toTeamListItem } from "@/server/repositories/mappers";

const COLUMNS = "id,full_name,position,subject,bio,category,member_group,experience,photo_url,photo_alt,email,phone,sort_order,is_visible,created_at,updated_at";

type DbTeam = {
  id: string;
  full_name: string;
  position: string;
  subject: string | null;
  bio: string | null;
  category: string | null;
  member_group: string;
  experience: string | null;
  photo_url: string | null;
  photo_alt: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

function toRow(d: DbTeam): TeamRow {
  return {
    id: d.id,
    name: d.full_name,
    role: d.position,
    subject: d.subject,
    group: (d.member_group as TeamRow["group"]) ?? "teachers",
    category: d.category ?? "",
    experience: d.experience ?? "",
    photo: d.photo_url ?? "",
    alt: d.photo_alt ?? "",
    bio: d.bio,
    email: d.email,
    phone: d.phone,
    sortOrder: d.sort_order,
    isVisible: d.is_visible,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function toDb(r: Partial<TeamRow>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (r.name !== undefined) db.full_name = r.name;
  if (r.role !== undefined) db.position = r.role;
  if (r.subject !== undefined) db.subject = r.subject;
  if (r.bio !== undefined) db.bio = r.bio;
  if (r.category !== undefined) db.category = r.category;
  if (r.group !== undefined) db.member_group = r.group;
  if (r.experience !== undefined) db.experience = r.experience;
  if (r.photo !== undefined) db.photo_url = r.photo || null;
  if (r.alt !== undefined) db.photo_alt = r.alt;
  if (r.email !== undefined) db.email = r.email;
  if (r.phone !== undefined) db.phone = r.phone;
  if (r.sortOrder !== undefined) db.sort_order = r.sortOrder;
  if (r.isVisible !== undefined) db.is_visible = r.isVisible;
  return db;
}

class SupabaseTeamRepository implements TeamRepository {
  async list(q: TeamQuery): Promise<{ items: TeamListItemDto[]; page: number; limit: number; total: number; totalPages: number }> {
    const sb = supabaseAdmin();
    let sel = sb.from("team_members").select(COLUMNS, { count: "exact" }).eq("is_visible", true);
    if (q.role) sel = sel.eq("member_group", q.role);
    if (q.subject) {
      const n = likeSafe(q.subject);
      if (n) sel = sel.ilike("subject", `%${n}%`);
    }
    if (q.search) {
      const n = likeSafe(q.search);
      if (n) sel = sel.or(`full_name.ilike.%${n}%,position.ilike.%${n}%,subject.ilike.%${n}%`);
    }
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("sort_order").range(from, to);
    const rows = (dbGuard(res.error, res.data) as DbTeam[] | null ?? []).map(toRow);
    return { ...meta(res.count, q.page, q.limit), items: rows.map(toTeamListItem) };
  }

  async byId(id: string): Promise<TeamItemDto | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("team_members").select(COLUMNS).eq("id", id).eq("is_visible", true).maybeSingle();
    dbGuard(error, data);
    return data ? toTeamItem(toRow(data as DbTeam)) : null;
  }
}

class SupabaseAdminTeamRepository implements AdminReorderableRepository<TeamRow> {
  async list(q: { search?: string; status?: "all" | "visible" | "hidden"; page: number; limit: number }) {
    const sb = supabaseAdmin();
    let sel = sb.from("team_members").select(COLUMNS, { count: "exact" });
    if (q.status === "visible") sel = sel.eq("is_visible", true);
    if (q.status === "hidden") sel = sel.eq("is_visible", false);
    if (q.search) {
      const n = likeSafe(q.search);
      if (n) sel = sel.or(`full_name.ilike.%${n}%,position.ilike.%${n}%`);
    }
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("sort_order").range(from, to);
    const rows = (dbGuard(res.error, res.data) as DbTeam[] | null ?? []).map(toRow);
    return { ...meta(res.count, q.page, q.limit), items: rows };
  }

  async byId(id: string) {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("team_members").select(COLUMNS).eq("id", id).maybeSingle();
    dbGuard(error, data);
    return data ? toRow(data as DbTeam) : null;
  }

  async create(row: TeamRow) {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("team_members")
      .insert({ ...toDb(row), full_name: row.name, position: row.role, member_group: row.group, sort_order: row.sortOrder })
      .select(COLUMNS)
      .single();
    return toRow(dbGuard(error, data) as DbTeam);
  }

  async update(id: string, patch: Partial<TeamRow>) {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("team_members").update(toDb(patch)).eq("id", id).select(COLUMNS).maybeSingle();
    dbGuard(error, data);
    return data ? toRow(data as DbTeam) : null;
  }

  async remove(id: string) {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("team_members").delete().eq("id", id).select("id");
    dbGuard(error, data);
    return ((data as Array<{ id: string }> | null) ?? []).length > 0;
  }

  async reorder(orderedIds: string[]) {
    const sb = supabaseAdmin();
    const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
    const { error } = await sb.from("team_members").upsert(updates, { onConflict: "id" });
    dbGuard(error, true);
    return true;
  }
}

export const supabaseTeamRepository = new SupabaseTeamRepository();
export const supabaseAdminTeamRepository = new SupabaseAdminTeamRepository();
