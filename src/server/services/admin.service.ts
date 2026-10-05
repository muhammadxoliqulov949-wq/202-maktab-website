import { randomUUID } from "node:crypto";
import { AppError } from "@/server/errors/AppError";
import { repos } from "@/server/repositories";
import type { AdminStatusFilter } from "@/server/repositories/interfaces";
import type { AuditAction, FaqRow, FacilityRow, FeatureRow, GalleryRow, NewsRow, QuickLinkRow, StatRow, SubmissionRow, SubmissionStatus, TeamRow } from "@/server/repositories/types";
import { cacheInvalidation } from "@/server/services/content.services";
import { audit, type AdminIdentity } from "@/server/services/audit";
import {
  slugify,
  type NewsCreateInput,
  type NewsUpdateInput,
} from "@/server/validation/adminSchemas";

/**
 * ADMIN SERVICE.
 *
 * Phase 4 access model:
 *  - Authentication is Supabase Auth; authorization is the database-backed
 *    `admin_users` + `admin_roles` model. The gate itself lives in
 *    `src/server/auth/actor.ts` (`requireAdminActor`) and is called by every
 *    admin controller — this service never trusts a caller that has not
 *    already passed it.
 *  - Every mutation writes an audit entry carrying the REAL Supabase user id.
 *  - Every mutation invalidates ONLY its own cache namespace.
 *
 * The Phase 3 shared-secret development gate was REMOVED entirely — it no
 * longer exists anywhere in the codebase and grants nothing.
 */

export { audit };
export type { AdminIdentity };

async function uniqueId(candidate: string, exists: (id: string) => Promise<boolean>): Promise<string> {
  let id = candidate || randomUUID().slice(0, 8);
  let n = 2;
  while (await exists(id)) {
    id = `${candidate}-${n++}`;
    if (n > 50) return randomUUID().slice(0, 8);
  }
  return id;
}

/* ================= news ================= */

export const adminService = {
  /* ---- news ---- */
  async newsList(q: { search?: string; category?: string; status: AdminStatusFilter; page: number; limit: number }) {
    return repos().adminNews.list(q);
  },

  async newsCategories(): Promise<string[]> {
    return repos().adminNews.categories();
  },

  async newsGet(id: string) {
    const row = await repos().adminNews.byId(id);
    if (!row) throw AppError.notFound("Article not found");
    return row;
  },

  async newsCreate(input: NewsCreateInput, ident: AdminIdentity) {
    const r = repos().adminNews;
    const slug = input.slug ?? slugify(input.title);
    if (!slug) throw AppError.badRequest("Slug could not be generated from title");
    if (await r.slugExists(slug)) throw AppError.conflict(`Slug "${slug}" already exists`);

    const now = new Date().toISOString();
    const categories = await r.categories();
    const category = input.category && (categories.length === 0 || categories.includes(input.category)) ? input.category : categories[0] ?? input.category;

    const row: NewsRow = {
      id: randomUUID(),
      slug,
      title: input.title,
      excerpt: input.excerpt ?? "",
      category,
      date: (input.publishedAt ?? now).slice(0, 10),
      readingTime: input.readingTime ?? "",
      image: input.coverImage ?? "",
      alt: input.coverAlt ?? "",
      body: input.content ?? [],
      author: input.author ?? null,
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? (input.publishedAt ?? now) : (input.publishedAt ?? null),
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const created = await r.create(row);
    await audit(ident, "CREATE", "news", created.id, { slug: created.slug, title: created.title });
    await cacheInvalidation.invalidateNews();
    return created;
  },

  async newsUpdate(id: string, patch: NewsUpdateInput, ident: AdminIdentity) {
    const r = repos().adminNews;
    const existing = await r.byId(id);
    if (!existing) throw AppError.notFound("Article not found");

    if (patch.slug && patch.slug !== existing.slug && (await r.slugExists(patch.slug, id))) {
      throw AppError.conflict(`Slug "${patch.slug}" already exists`);
    }

    const db: Partial<NewsRow> = {};
    if (patch.title !== undefined) db.title = patch.title;
    if (patch.slug !== undefined) db.slug = patch.slug;
    if (patch.excerpt !== undefined) db.excerpt = patch.excerpt;
    if (patch.category !== undefined) db.category = patch.category;
    if (patch.author !== undefined) db.author = patch.author ?? null;
    if (patch.readingTime !== undefined) db.readingTime = patch.readingTime ?? "";
    if (patch.coverImage !== undefined) db.image = patch.coverImage ?? "";
    if (patch.coverAlt !== undefined) db.alt = patch.coverAlt ?? "";
    if (patch.content !== undefined) db.body = patch.content;
    if (patch.publishedAt !== undefined) db.publishedAt = patch.publishedAt ?? null;

    let action: AuditAction = "UPDATE";
    if (patch.isPublished !== undefined && patch.isPublished !== existing.isPublished) {
      db.isPublished = patch.isPublished;
      action = patch.isPublished ? "PUBLISH" : "UNPUBLISH";
      if (patch.isPublished && !existing.publishedAt && !patch.publishedAt) db.publishedAt = new Date().toISOString();
    } else if (patch.isPublished !== undefined) {
      db.isPublished = patch.isPublished;
    }
    if (Object.keys(db).length === 0) return existing;

    const updated = await r.update(id, db);
    if (!updated) throw AppError.notFound("Article not found");
    await audit(ident, action, "news", id, { slug: updated.slug });
    await cacheInvalidation.invalidateNews();
    return updated;
  },

  /** Soft delete by default (archive); hard delete only with hard=true. */
  async newsDelete(id: string, hard: boolean, ident: AdminIdentity) {
    const r = repos().adminNews;
    const existing = await r.byId(id);
    if (!existing) throw AppError.notFound("Article not found");
    if (hard) {
      const removed = await r.remove(id);
      if (!removed) throw AppError.notFound("Article not found");
      await audit(ident, "DELETE", "news", id, { slug: existing.slug, hard: true });
    } else {
      await r.setStatus(id, { archivedAt: new Date().toISOString(), isPublished: false });
      await audit(ident, "ARCHIVE", "news", id, { slug: existing.slug });
    }
    await cacheInvalidation.invalidateNews();
    return { archived: !hard };
  },

  /* ---- reorderable collections ---- */
  async collectionList(entity: CollectionName, q: { search?: string; status?: "all" | "visible" | "hidden"; page: number; limit: number }) {
    return collection(entity).list(q);
  },
  async collectionGet(entity: CollectionName, id: string) {
    const row = await collection(entity).byId(id);
    if (!row) throw AppError.notFound("Record not found");
    return row;
  },
  async collectionCreate(entity: CollectionName, row: Record<string, unknown>, ident: AdminIdentity) {
    const r = collection(entity);
    const withId = { ...(row as object), id: await uniqueId(String(row.id ?? entity), (x) => r.byId(x).then(Boolean)) } as never;
    const created = await r.create(withId);
    await audit(ident, "CREATE", entity, created.id, null);
    await invalidateEntity(entity);
    return created;
  },
  async collectionUpdate(entity: CollectionName, id: string, patch: Record<string, unknown>, ident: AdminIdentity) {
    const r = collection(entity);
    const updated = await r.update(id, patch as never);
    if (!updated) throw AppError.notFound("Record not found");
    await audit(ident, "UPDATE", entity, id, null);
    await invalidateEntity(entity);
    return updated;
  },
  async collectionDelete(entity: CollectionName, id: string, ident: AdminIdentity) {
    const r = collection(entity);
    const removed = await r.remove(id);
    if (!removed) throw AppError.notFound("Record not found");
    await audit(ident, "DELETE", entity, id, { hard: true });
    await invalidateEntity(entity);
    return { removed: true };
  },
  async collectionReorder(entity: CollectionName, ids: string[], ident: AdminIdentity) {
    const r = collection(entity);
    const okFlag = await r.reorder(ids);
    if (!okFlag) throw AppError.badRequest("Invalid id list for reorder");
    await audit(ident, "REORDER", entity, null, { count: ids.length });
    await invalidateEntity(entity);
    return { reordered: ids.length };
  },

  /* ---- settings ---- */
  async settingsGet() {
    return repos().adminSettings.get();
  },
  async settingsPatch(patch: Record<string, unknown>, ident: AdminIdentity) {
    const updated = await repos().adminSettings.update(patch as never);
    await audit(ident, "SETTINGS_UPDATE", "site-settings", "1", { keys: Object.keys(patch) });
    await cacheInvalidation.invalidateSiteConfig();
    await cacheInvalidation.invalidateContactInfo();
    return updated;
  },
  async contactInfoGet() {
    return repos().adminSettings.getContactInfo();
  },
  async contactInfoPatch(patch: Record<string, unknown>, ident: AdminIdentity) {
    const updated = await repos().adminSettings.updateContactInfo(patch as never);
    await audit(ident, "SETTINGS_UPDATE", "contact-info", "1", { keys: Object.keys(patch) });
    await cacheInvalidation.invalidateContactInfo();
    return updated;
  },

  /* ---- contact submissions (admin-only) ---- */
  async submissionsList(q: { status?: SubmissionStatus; page: number; limit: number }) {
    return repos().submissions.list(q);
  },
  async submissionGet(id: string) {
    const row = await repos().submissions.byId(id);
    if (!row) throw AppError.notFound("Submission not found");
    return row;
  },
  async submissionStatus(id: string, status: SubmissionStatus, ident: AdminIdentity) {
    const updated = await repos().submissions.updateStatus(id, status);
    if (!updated) throw AppError.notFound("Submission not found");
    await audit(ident, "STATUS_CHANGE", "contact-submission", id, { status });
    return updated;
  },
  async submissionDelete(id: string, ident: AdminIdentity) {
    const removed = await repos().submissions.remove(id);
    if (!removed) throw AppError.notFound("Submission not found");
    await audit(ident, "DELETE", "contact-submission", id, { hard: true });
    return { removed: true };
  },

  /* ---- audit ---- */
  async auditList(q: { page: number; limit: number; action?: string; entityType?: string }) {
    return repos().audit.list(q);
  },

  /* ---- dashboard (real counts only — no fake analytics) ---- */
  async dashboard() {
    const r = repos();
    const [newsPub, newsDraft, newsArchived, team, gallery, faqs, stats, features, facilities, quickLinks, subs, recentAudit, recentSubs] = await Promise.all([
      r.adminNews.list({ status: "published", page: 1, limit: 1 }),
      r.adminNews.list({ status: "draft", page: 1, limit: 1 }),
      r.adminNews.list({ status: "archived", page: 1, limit: 1 }),
      r.adminTeam.list({ page: 1, limit: 1, status: "all" }),
      r.adminGallery.list({ page: 1, limit: 1, status: "all" }),
      r.adminFaqs.list({ page: 1, limit: 1, status: "all" }),
      r.adminStats.list({ page: 1, limit: 1, status: "all" }),
      r.adminFeatures.list({ page: 1, limit: 1, status: "all" }),
      r.adminFacilities.list({ page: 1, limit: 1, status: "all" }),
      r.adminQuickLinks.list({ page: 1, limit: 1, status: "all" }),
      r.submissions.counts(),
      r.audit.recent(6),
      r.submissions.list({ page: 1, limit: 5 }),
    ]);
    return {
      counts: {
        newsPublished: newsPub.total,
        newsDraft: newsDraft.total,
        newsArchived: newsArchived.total,
        team: team.total,
        gallery: gallery.total,
        faqs: faqs.total,
        statistics: stats.total,
        features: features.total,
        facilities: facilities.total,
        quickLinks: quickLinks.total,
        submissions: subs,
        media: 0, // media_assets listing arrives with Storage integration (Phase 4/5)
      },
      recentAudit,
      recentSubmissions: recentSubs.items,
      generatedAt: new Date().toISOString(),
    };
  },
};

export type CollectionName = "team" | "gallery" | "faqs" | "facilities" | "features" | "statistics" | "quick-links";

function collection(entity: CollectionName) {
  const r = repos();
  switch (entity) {
    case "team":
      return r.adminTeam;
    case "gallery":
      return r.adminGallery;
    case "faqs":
      return r.adminFaqs;
    case "facilities":
      return r.adminFacilities;
    case "features":
      return r.adminFeatures;
    case "statistics":
      return r.adminStats;
    case "quick-links":
      return r.adminQuickLinks;
  }
}

async function invalidateEntity(entity: CollectionName): Promise<void> {
  switch (entity) {
    case "team":
      await cacheInvalidation.invalidateTeam();
      break;
    case "gallery":
      await cacheInvalidation.invalidateGallery();
      break;
    case "faqs":
      await cacheInvalidation.invalidateFaq();
      break;
    case "facilities":
      await cacheInvalidation.invalidateFacilities();
      break;
    case "features":
      await cacheInvalidation.invalidateFeatures();
      break;
    case "statistics":
      await cacheInvalidation.invalidateStats();
      break;
    case "quick-links":
      await cacheInvalidation.invalidateQuickLinks();
      break;
  }
}

export type { FaqRow, FacilityRow, FeatureRow, GalleryRow, NewsRow, QuickLinkRow, StatRow, SubmissionRow, TeamRow };
