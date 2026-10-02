import { randomUUID } from "node:crypto";
import type {
  AdminFaqRepository,
  AdminFacilityRepository,
  AdminFeatureRepository,
  AdminGalleryRepository,
  AdminQuickLinkRepository,
  AdminSettingsRepository,
  AdminStatRepository,
  AdminStatusFilter,
  AdminTeamRepository,
  AuditRepository,
  ContactSubmissionRepository,
} from "@/server/repositories/interfaces";
import type { Paginated } from "@/server/types/api";
import type {
  AuditRow,
  ContactInfoRow,
  FaqRow,
  FacilityRow,
  FeatureRow,
  GalleryRow,
  QuickLinkRow,
  SiteSettingsRow,
  StatRow,
  SubmissionRow,
  SubmissionStatus,
  TeamRow,
} from "@/server/repositories/types";
import { getStore, touch } from "@/server/repositories/store";
import { paginate } from "@/server/repositories/json/news.repository";

/**
 * JSON-provider ADMIN repositories — real CRUD over the in-memory store.
 * Dev-mode trade-off (documented): changes reset on process restart.
 * DATA_PROVIDER=supabase swaps these for PostgreSQL persistence with the
 * identical interface.
 */

type Reorderable = { id: string; sortOrder?: number; isVisible?: boolean };

class JsonAdminCollection<T extends Reorderable> {
  constructor(private readonly pick: () => T[]) {}

  list(q: { search?: string; status?: "all" | "visible" | "hidden"; page: number; limit: number }, searchFields: Array<keyof T>): Paginated<T> {
    let rows = [...this.pick()];
    if (q.status === "visible") rows = rows.filter((r) => r.isVisible !== false);
    if (q.status === "hidden") rows = rows.filter((r) => r.isVisible === false);
    if (q.search) {
      const needle = q.search.toLowerCase();
      rows = rows.filter((r) => searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(needle)));
    }
    rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return paginate(rows, q.page, q.limit);
  }

  byId(id: string) {
    return this.pick().find((r) => r.id === id) ?? null;
  }

  create(row: T) {
    this.pick().push(row);
    return row;
  }

  update(id: string, patch: Partial<T>) {
    const row = this.byId(id);
    if (!row) return null;
    Object.assign(row, patch);
    return row;
  }

  remove(id: string) {
    const rows = this.pick();
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    return true;
  }

  reorder(orderedIds: string[]) {
    const rows = this.pick();
    const byId = new Map(rows.map((r) => [r.id, r]));
    if (!orderedIds.every((id) => byId.has(id))) return false;
    orderedIds.forEach((id, i) => {
      const row = byId.get(id)!;
      row.sortOrder = i;
    });
    return true;
  }
}

function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

const t = () => new Date().toISOString();

/* ---------------- adapters (async interface over sync collection) ---------------- */

function wire<T extends Reorderable>(
  coll: JsonAdminCollection<T>,
  pickLength: () => number,
  searchFields: Array<keyof T>,
  nextSortOrder: () => number
) {
  return {
    list: async (q: { search?: string; status?: "all" | "visible" | "hidden"; page: number; limit: number }) => coll.list(q, searchFields),
    byId: async (id: string) => coll.byId(id),
    create: async (row: T) => coll.create({ ...(row as T), sortOrder: row.sortOrder ?? nextSortOrder() } as T),
    update: async (id: string, patch: Partial<T>) => coll.update(id, patch),
    remove: async (id: string) => coll.remove(id),
    reorder: async (ids: string[]) => coll.reorder(ids),
  };
}

/* ---------------- team ---------------- */
export const jsonAdminTeamRepository: AdminTeamRepository = wire<TeamRow>(
  new JsonAdminCollection<TeamRow>(() => getStore().team),
  () => getStore().team.length,
  ["name", "role", "subject"],
  () => getStore().team.length
);

/* ---------------- gallery ---------------- */
export const jsonAdminGalleryRepository: AdminGalleryRepository = wire<GalleryRow>(
  new JsonAdminCollection<GalleryRow>(() => getStore().gallery),
  () => getStore().gallery.length,
  ["alt", "album", "category", "src"],
  () => getStore().gallery.length
);

/* ---------------- faqs ---------------- */
export const jsonAdminFaqRepository: AdminFaqRepository = wire<FaqRow>(
  new JsonAdminCollection<FaqRow>(() => getStore().faqs),
  () => getStore().faqs.length,
  ["q", "a"],
  () => getStore().faqs.length
);

/* ---------------- facilities ---------------- */
export const jsonAdminFacilityRepository: AdminFacilityRepository = wire<FacilityRow>(
  new JsonAdminCollection<FacilityRow>(() => getStore().facilities),
  () => getStore().facilities.length,
  ["title", "description", "kicker"],
  () => getStore().facilities.length
);

/* ---------------- features ---------------- */
export const jsonAdminFeatureRepository: AdminFeatureRepository = wire<FeatureRow>(
  new JsonAdminCollection<FeatureRow>(() => getStore().features),
  () => getStore().features.length,
  ["title", "description"],
  () => getStore().features.length
);

/* ---------------- statistics ---------------- */
export const jsonAdminStatRepository: AdminStatRepository = wire<StatRow>(
  new JsonAdminCollection<StatRow>(() => getStore().stats),
  () => getStore().stats.length,
  ["label", "description"],
  () => getStore().stats.length
);

/* ---------------- quick links ---------------- */
export const jsonAdminQuickLinkRepository: AdminQuickLinkRepository = wire<QuickLinkRow>(
  new JsonAdminCollection<QuickLinkRow>(() => getStore().quickLinks),
  () => getStore().quickLinks.length,
  ["title", "description", "href"],
  () => getStore().quickLinks.length
);

/* ---------------- settings + contact info ---------------- */
export const jsonAdminSettingsRepository: AdminSettingsRepository = {
  async get() {
    return getStore().settings;
  },
  async update(patch) {
    Object.assign(getStore().settings, patch);
    return getStore().settings;
  },
  async getContactInfo() {
    return getStore().contactInfo;
  },
  async updateContactInfo(patch) {
    Object.assign(getStore().contactInfo, patch);
    return getStore().contactInfo;
  },
};

/* ---------------- contact submissions (admin-only, in-memory for json provider) ---------------- */
export const jsonSubmissionsRepository: ContactSubmissionRepository = {
  async save(submission) {
    const row: SubmissionRow = { ...submission, id: submission.id || randomUUID() };
    getStore().submissions.unshift(row);
    return row;
  },
  list(q) {
    let rows = [...getStore().submissions];
    if (q.status) rows = rows.filter((r) => r.status === q.status);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return Promise.resolve(paginate(rows, q.page, q.limit));
  },
  async byId(id) {
    return getStore().submissions.find((r) => r.id === id) ?? null;
  },
  async updateStatus(id, status) {
    const row = getStore().submissions.find((r) => r.id === id);
    if (!row) return null;
    row.status = status;
    row.handledAt = status === "resolved" || status === "spam" ? t() : row.handledAt;
    return row;
  },
  async remove(id) {
    const rows = getStore().submissions;
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return false;
    rows.splice(i, 1);
    return true;
  },
  async counts() {
    const c = { new: 0, in_progress: 0, resolved: 0, spam: 0, total: getStore().submissions.length };
    for (const r of getStore().submissions) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  },
};

/* ---------------- audit log (append-only) ---------------- */
export const jsonAuditRepository: AuditRepository = {
  async append(entry) {
    const row: AuditRow = { ...entry, id: randomUUID(), createdAt: t() };
    getStore().audit.unshift(row);
    if (getStore().audit.length > 500) getStore().audit.length = 500; // bounded in dev memory
    return row;
  },
  list(q) {
    let rows = [...getStore().audit];
    if (q.action) rows = rows.filter((r) => r.action === q.action);
    if (q.entityType) rows = rows.filter((r) => r.entityType === q.entityType);
    return Promise.resolve(paginate(rows, q.page, q.limit));
  },
  async recent(n) {
    return getStore().audit.slice(0, n);
  },
};

export const jsonId = { newId, touch, t, nowIso: t };
export type { AdminStatusFilter };
