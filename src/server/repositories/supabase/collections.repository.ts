import "server-only";
import { randomUUID } from "node:crypto";
import type {
  AdminFaqRepository,
  AdminFacilityRepository,
  AdminFeatureRepository,
  AdminQuickLinkRepository,
  AdminStatRepository,
  AuditRepository,
  ContactSubmissionRepository,
} from "@/server/repositories/interfaces";
import type { Paginated } from "@/server/types/api";
import type { AuditRow, FaqRow, FacilityRow, FeatureRow, QuickLinkRow, StatRow, SubmissionRow, SubmissionStatus } from "@/server/repositories/types";
import { supabaseAdmin } from "@/server/repositories/supabase/client";
import { dbGuard, meta, rangeFor } from "@/server/repositories/supabase/db";

/**
 * Supabase admin repositories for the simple collections (faqs, facilities,
 * features, statistics, quick-links) + contact submissions + audit log.
 * These tables share the shape: text/uuid id, optional is_visible, sort_order.
 */

type SimpleRow = { id: string; sortOrder: number; isVisible: boolean };

function metaOf(res: { count: number | null }, page: number, limit: number) {
  return meta(res.count, page, limit);
}

class SupabaseAdminCollection<T extends SimpleRow> {
  constructor(
    private readonly table: string,
    private readonly fromDb: (d: Record<string, unknown>) => T,
    private readonly toDb: (patch: Partial<T>) => Record<string, unknown>,
    private readonly searchColumns: string[]
  ) {}

  async list(q: { search?: string; status?: "all" | "visible" | "hidden"; page: number; limit: number }): Promise<Paginated<T>> {
    const sb = supabaseAdmin();
    let sel = sb.from(this.table).select("*", { count: "exact" });
    if (q.status === "visible") sel = sel.eq("is_visible", true);
    if (q.status === "hidden") sel = sel.eq("is_visible", false);
    if (q.search) {
      const n = q.search.replace(/[%_,()*]/g, " ").trim().slice(0, 100);
      if (n) sel = sel.or(this.searchColumns.map((c) => `${c}.ilike.%${n}%`).join(","));
    }
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("sort_order").range(from, to);
    const rows = (dbGuard(res.error, res.data) as Array<Record<string, unknown>> | null ?? []).map(this.fromDb);
    return { ...metaOf(res, q.page, q.limit), items: rows };
  }

  async byId(id: string): Promise<T | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from(this.table).select("*").eq("id", id).maybeSingle();
    dbGuard(error, data);
    return data ? this.fromDb(data as Record<string, unknown>) : null;
  }

  async create(row: T): Promise<T> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from(this.table).insert(this.toDb(row)).select("*").single();
    return this.fromDb(dbGuard(error, data) as Record<string, unknown>);
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from(this.table).update(this.toDb(patch)).eq("id", id).select("*").maybeSingle();
    dbGuard(error, data);
    return data ? this.fromDb(data as Record<string, unknown>) : null;
  }

  async remove(id: string): Promise<boolean> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from(this.table).delete().eq("id", id).select("id");
    dbGuard(error, data);
    return ((data as Array<{ id: string }> | null) ?? []).length > 0;
  }

  async reorder(orderedIds: string[]): Promise<boolean> {
    const sb = supabaseAdmin();
    const { error } = await sb.from(this.table).upsert(orderedIds.map((id, i) => ({ id, sort_order: i })), { onConflict: "id" });
    dbGuard(error, true);
    return true;
  }
}

/* ---------------- mappings ---------------- */

const mapFaq = (d: Record<string, unknown>): FaqRow => ({
  id: String(d.id),
  q: String(d.question ?? ""),
  a: String(d.answer ?? ""),
  sortOrder: Number(d.sort_order ?? 0),
  isVisible: Boolean(d.is_visible),
  createdAt: String(d.created_at ?? ""),
  updatedAt: String(d.updated_at ?? ""),
});
const faqToDb = (p: Partial<FaqRow>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (p.q !== undefined) db.question = p.q;
  if (p.a !== undefined) db.answer = p.a;
  if (p.sortOrder !== undefined) db.sort_order = p.sortOrder;
  if (p.isVisible !== undefined) db.is_visible = p.isVisible;
  return db;
};

const mapFacility = (d: Record<string, unknown>): FacilityRow => ({
  id: String(d.id),
  kicker: String(d.kicker ?? ""),
  title: String(d.title ?? ""),
  description: String(d.description ?? ""),
  image: String(d.image_url ?? ""),
  alt: String(d.image_alt ?? ""),
  videoUrl: (d.video_url as string | null) ?? null,
  sortOrder: Number(d.sort_order ?? 0),
  isVisible: Boolean(d.is_visible),
});
const facilityToDb = (p: Partial<FacilityRow>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (p.kicker !== undefined) db.kicker = p.kicker;
  if (p.title !== undefined) db.title = p.title;
  if (p.description !== undefined) db.description = p.description;
  if (p.image !== undefined) db.image_url = p.image;
  if (p.alt !== undefined) db.image_alt = p.alt;
  if (p.videoUrl !== undefined) db.video_url = p.videoUrl;
  if (p.sortOrder !== undefined) db.sort_order = p.sortOrder;
  if (p.isVisible !== undefined) db.is_visible = p.isVisible;
  return db;
};

const mapFeature = (d: Record<string, unknown>): FeatureRow => ({
  id: String(d.id),
  index: String(d.display_index ?? ""),
  title: String(d.title ?? ""),
  description: String(d.description ?? ""),
  icon: String(d.icon ?? "info"),
  image: (d.image_url as string | null) ?? null,
  alt: (d.alt as string | null) ?? null,
  sortOrder: Number(d.sort_order ?? 0),
  isVisible: Boolean(d.is_visible),
});
const featureToDb = (p: Partial<FeatureRow>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (p.index !== undefined) db.display_index = p.index;
  if (p.title !== undefined) db.title = p.title;
  if (p.description !== undefined) db.description = p.description;
  if (p.icon !== undefined) db.icon = p.icon;
  if (p.image !== undefined) db.image_url = p.image;
  if (p.alt !== undefined) db.alt = p.alt;
  if (p.sortOrder !== undefined) db.sort_order = p.sortOrder;
  if (p.isVisible !== undefined) db.is_visible = p.isVisible;
  return db;
};

const mapStat = (d: Record<string, unknown>): StatRow => ({
  id: String(d.id),
  value: Number(d.value ?? 0),
  suffix: String(d.suffix ?? ""),
  label: String(d.label ?? ""),
  description: String(d.description ?? ""),
  icon: String(d.icon ?? "info"),
  sortOrder: Number(d.sort_order ?? 0),
  isVisible: Boolean(d.is_visible),
});
const statToDb = (p: Partial<StatRow>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (p.value !== undefined) db.value = p.value;
  if (p.suffix !== undefined) db.suffix = p.suffix;
  if (p.label !== undefined) db.label = p.label;
  if (p.description !== undefined) db.description = p.description;
  if (p.icon !== undefined) db.icon = p.icon;
  if (p.sortOrder !== undefined) db.sort_order = p.sortOrder;
  if (p.isVisible !== undefined) db.is_visible = p.isVisible;
  return db;
};

const mapQuickLink = (d: Record<string, unknown>): QuickLinkRow => ({
  id: String(d.id),
  title: String(d.title ?? ""),
  description: String(d.description ?? ""),
  icon: String(d.icon ?? "link"),
  href: String(d.url ?? ""),
  openInNewTab: Boolean(d.open_in_new_tab),
  sortOrder: Number(d.sort_order ?? 0),
  isVisible: Boolean(d.is_visible),
});
const quickLinkToDb = (p: Partial<QuickLinkRow>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (p.title !== undefined) db.title = p.title;
  if (p.description !== undefined) db.description = p.description;
  if (p.icon !== undefined) db.icon = p.icon;
  if (p.href !== undefined) db.url = p.href;
  if (p.openInNewTab !== undefined) db.open_in_new_tab = p.openInNewTab;
  if (p.sortOrder !== undefined) db.sort_order = p.sortOrder;
  if (p.isVisible !== undefined) db.is_visible = p.isVisible;
  return db;
};

/* ---------------- instances ---------------- */

const make = <T extends SimpleRow>(
  table: string,
  fromDb: (d: Record<string, unknown>) => T,
  toDb: (patch: Partial<T>) => Record<string, unknown>,
  searchColumns: string[]
) => new SupabaseAdminCollection<T>(table, fromDb, toDb, searchColumns);

const faqs = make<FaqRow>("faqs", mapFaq, faqToDb, ["question", "answer"]);
const facilities = make<FacilityRow>("facilities", mapFacility, facilityToDb, ["title", "description"]);
const features = make<FeatureRow>("features", mapFeature, featureToDb, ["title", "description"]);
const stats = make<StatRow>("statistics", mapStat, statToDb, ["label", "description"]);
const quickLinks = make<QuickLinkRow>("quick_links", mapQuickLink, quickLinkToDb, ["title", "url"]);

export const supabaseAdminFaqRepository: AdminFaqRepository = faqs;
export const supabaseAdminFacilityRepository: AdminFacilityRepository = facilities;
export const supabaseAdminFeatureRepository: AdminFeatureRepository = features;
export const supabaseAdminStatRepository: AdminStatRepository = stats;
export const supabaseAdminQuickLinkRepository: AdminQuickLinkRepository = quickLinks;

/* ---------------- contact submissions (admin-only) ---------------- */

const mapSubmission = (d: Record<string, unknown>): SubmissionRow => ({
  id: String(d.id),
  name: String(d.name ?? ""),
  contact: String(d.contact ?? ""),
  topic: String(d.topic ?? ""),
  message: String(d.message ?? ""),
  status: (d.status as SubmissionStatus) ?? "new",
  source: String(d.source ?? "website"),
  createdAt: String(d.created_at ?? ""),
  handledAt: (d.handled_at as string | null) ?? null,
});

class SupabaseSubmissionsRepository implements ContactSubmissionRepository {
  async save(submission: SubmissionRow): Promise<SubmissionRow> {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("contact_submissions")
      .insert({
        id: submission.id || randomUUID(),
        name: submission.name,
        contact: submission.contact,
        topic: submission.topic || null,
        message: submission.message,
        status: submission.status,
        source: submission.source,
      })
      .select("*")
      .single();
    return mapSubmission(dbGuard(error, data) as Record<string, unknown>);
  }

  async list(q: { status?: SubmissionStatus; page: number; limit: number }): Promise<Paginated<SubmissionRow>> {
    const sb = supabaseAdmin();
    let sel = sb.from("contact_submissions").select("*", { count: "exact" });
    if (q.status) sel = sel.eq("status", q.status);
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("created_at", { ascending: false }).range(from, to);
    const rows = (dbGuard(res.error, res.data) as Array<Record<string, unknown>> | null ?? []).map(mapSubmission);
    return { ...metaOf(res, q.page, q.limit), items: rows };
  }

  async byId(id: string): Promise<SubmissionRow | null> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("contact_submissions").select("*").eq("id", id).maybeSingle();
    dbGuard(error, data);
    return data ? mapSubmission(data as Record<string, unknown>) : null;
  }

  async updateStatus(id: string, status: SubmissionStatus): Promise<SubmissionRow | null> {
    const sb = supabaseAdmin();
    const handled = status === "resolved" || status === "spam" ? new Date().toISOString() : null;
    const { data, error } = await sb.from("contact_submissions").update({ status, handled_at: handled }).eq("id", id).select("*").maybeSingle();
    dbGuard(error, data);
    return data ? mapSubmission(data as Record<string, unknown>) : null;
  }

  async remove(id: string): Promise<boolean> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("contact_submissions").delete().eq("id", id).select("id");
    dbGuard(error, data);
    return ((data as Array<{ id: string }> | null) ?? []).length > 0;
  }

  async counts() {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("contact_submissions").select("status");
    dbGuard(error, data);
    const c = { new: 0, in_progress: 0, resolved: 0, spam: 0, total: 0 };
    for (const r of (data as Array<{ status: SubmissionStatus }> | null) ?? []) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      c.total++;
    }
    return c;
  }
}

export const supabaseSubmissionsRepository = new SupabaseSubmissionsRepository();

/* ---------------- audit log ---------------- */

class SupabaseAuditRepository implements AuditRepository {
  async append(entry: Omit<AuditRow, "id" | "createdAt">): Promise<AuditRow> {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("admin_audit_logs")
      .insert({
        admin_identifier: entry.adminIdentifier,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        metadata: entry.metadata ?? {},
      })
      .select("*")
      .single();
    const d = dbGuard(error, data) as Record<string, unknown>;
    return {
      id: String(d.id),
      adminIdentifier: (d.admin_identifier as string | null) ?? null,
      action: d.action as AuditRow["action"],
      entityType: String(d.entity_type ?? ""),
      entityId: (d.entity_id as string | null) ?? null,
      metadata: (d.metadata as Record<string, unknown> | null) ?? null,
      createdAt: String(d.created_at ?? ""),
    };
  }

  async list(q: { page: number; limit: number; action?: string; entityType?: string }): Promise<Paginated<AuditRow>> {
    const sb = supabaseAdmin();
    let sel = sb.from("admin_audit_logs").select("*", { count: "exact" });
    if (q.action) sel = sel.eq("action", q.action);
    if (q.entityType) sel = sel.eq("entity_type", q.entityType);
    const { from, to } = rangeFor(q.page, q.limit);
    const res = await sel.order("created_at", { ascending: false }).range(from, to);
    const rows = (dbGuard(res.error, res.data) as Array<Record<string, unknown>> | null ?? []).map((d) => ({
      id: String(d.id),
      adminIdentifier: (d.admin_identifier as string | null) ?? null,
      action: d.action as AuditRow["action"],
      entityType: String(d.entity_type ?? ""),
      entityId: (d.entity_id as string | null) ?? null,
      metadata: (d.metadata as Record<string, unknown> | null) ?? null,
      createdAt: String(d.created_at ?? ""),
    }));
    return { ...metaOf(res, q.page, q.limit), items: rows };
  }

  async recent(n: number): Promise<AuditRow[]> {
    const sb = supabaseAdmin();
    const res = await sb.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(n);
    const rows = dbGuard(res.error, res.data) as Array<Record<string, unknown>> | null;
    return (rows ?? []).map((d) => ({
      id: String(d.id),
      adminIdentifier: (d.admin_identifier as string | null) ?? null,
      action: d.action as AuditRow["action"],
      entityType: String(d.entity_type ?? ""),
      entityId: (d.entity_id as string | null) ?? null,
      metadata: (d.metadata as Record<string, unknown> | null) ?? null,
      createdAt: String(d.created_at ?? ""),
    }));
  }
}

export const supabaseAuditRepository = new SupabaseAuditRepository();
