import "server-only";
import type { AdminSettingsRepository, ContentRepository } from "@/server/repositories/interfaces";
import type { ContactInfoRow, FaqRow, FacilityRow, FeatureRow, QuickLinkRow, SiteSettingsRow, StatRow } from "@/server/repositories/types";
import { supabaseAdmin } from "@/server/repositories/supabase/client";
import { dbGuard } from "@/server/repositories/supabase/db";
import {
  toContactInfoDto,
  toFacilityItem,
  toFaqItem,
  toFeatureItem,
  toQuickLinkItem,
  toSiteConfigDto,
  toStatItem,
} from "@/server/repositories/mappers";

/* ---------------- public static content ---------------- */

class SupabaseContentRepository implements ContentRepository {
  async siteConfig(): Promise<Record<string, unknown>> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
    dbGuard(error, data);
    const d = data as Record<string, unknown> | null;
    if (!d) throw new Error("site_settings row missing — run migrations + seed");
    const row: SiteSettingsRow = {
      name: String(d.school_name ?? ""),
      fullName: String(d.description ?? d.school_name ?? ""),
      tagline: String(d.tagline ?? ""),
      district: String(d.district ?? ""),
      address: String(d.address ?? ""),
      established: String(d.established ?? ""),
      locale: String(d.locale ?? "uz"),
      logoUrl: (d.logo_url as string | null) ?? null,
      faviconUrl: (d.favicon_url as string | null) ?? null,
      social: (d.social_links as SiteSettingsRow["social"]) ?? {},
    };
    return toSiteConfigDto(row);
  }

  async stats() {
    const items = await visibleOrdered<StatRow>("statistics");
    const mapped = items.map(toStatItem);
    return { items: mapped, count: mapped.length };
  }

  async features() {
    const items = await visibleOrdered<FeatureRow>("features");
    return { items: items.map(toFeatureItem), count: items.length };
  }

  async facilities() {
    const items = await visibleOrdered<FacilityRow>("facilities");
    return { items: items.map(toFacilityItem), count: items.length };
  }

  async faqs() {
    const items = await visibleOrdered<FaqRow>("faqs");
    return { items: items.map(toFaqItem), count: items.length };
  }

  async quickLinks() {
    const items = await visibleOrdered<QuickLinkRow>("quick_links");
    return { items: items.map(toQuickLinkItem), count: items.length };
  }

  async contactInfo(): Promise<Record<string, unknown>> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("contact_information").select("*").eq("id", 1).maybeSingle();
    dbGuard(error, data);
    const d = data as Record<string, unknown> | null;
    if (!d) throw new Error("contact_information row missing — run migrations + seed");
    const row: ContactInfoRow = {
      address: String(d.address ?? ""),
      phone: (d.phone as ContactInfoRow["phone"]) ?? { display: "", href: "" },
      mobile: (d.mobile as ContactInfoRow["mobile"]) ?? { display: "", href: "" },
      email: (d.email as ContactInfoRow["email"]) ?? { display: "", href: "" },
      hours: (d.working_hours as ContactInfoRow["hours"]) ?? [],
      map: {
        embed: String(d.map_embed ?? ""),
        route: String(d.map_route ?? ""),
        view: String(d.map_view ?? ""),
        latitude: Number(d.latitude ?? 0),
        longitude: Number(d.longitude ?? 0),
        verified: Boolean(d.is_verified),
      },
      social: (d.social_links as ContactInfoRow["social"]) ?? {},
    };
    return toContactInfoDto(row);
  }
}

/** Shared loader: visible rows in sort order for simple collections. */
async function visibleOrdered<T>(table: string): Promise<T[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from(table).select("*").eq("is_visible", true).order("sort_order");
  dbGuard(error, data);
  return (data as T[] | null) ?? [];
}

/* ---------------- settings + contact info (admin) ---------------- */

class SupabaseAdminSettingsRepository implements AdminSettingsRepository {
  async get(): Promise<SiteSettingsRow> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
    dbGuard(error, data);
    const d = data as Record<string, unknown> | null;
    if (!d) throw new Error("site_settings row missing — run migrations + seed");
    return {
      name: String(d.school_name ?? ""),
      fullName: String(d.description ?? ""),
      tagline: String(d.tagline ?? (d.description as string | null) ?? ""),
      district: String(d.district ?? ""),
      address: String(d.address ?? ""),
      established: String(d.established ?? ""),
      locale: String(d.locale ?? "uz"),
      logoUrl: (d.logo_url as string | null) ?? null,
      faviconUrl: (d.favicon_url as string | null) ?? null,
      social: (d.social_links as SiteSettingsRow["social"]) ?? {},
    };
  }

  async update(patch: Partial<SiteSettingsRow>): Promise<SiteSettingsRow> {
    const sb = supabaseAdmin();
    const db: Record<string, unknown> = {};
    if (patch.name !== undefined) db.school_name = patch.name;
    if (patch.fullName !== undefined) db.description = patch.fullName;
    if (patch.tagline !== undefined) db.tagline = patch.tagline;
    if (patch.district !== undefined) db.district = patch.district;
    if (patch.address !== undefined) db.address = patch.address;
    if (patch.established !== undefined) db.established = patch.established;
    if (patch.locale !== undefined) db.locale = patch.locale;
    if (patch.logoUrl !== undefined) db.logo_url = patch.logoUrl;
    if (patch.faviconUrl !== undefined) db.favicon_url = patch.faviconUrl;
    if (patch.social !== undefined) db.social_links = patch.social;
    const { data, error } = await sb.from("site_settings").update(db).eq("id", 1).select("*").maybeSingle();
    dbGuard(error, data);
    return this.get();
  }

  async getContactInfo(): Promise<ContactInfoRow> {
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("contact_information").select("*").eq("id", 1).maybeSingle();
    dbGuard(error, data);
    const d = data as Record<string, unknown> | null;
    if (!d) throw new Error("contact_information row missing");
    return {
      address: String(d.address ?? ""),
      phone: (d.phone as ContactInfoRow["phone"]) ?? { display: "", href: "" },
      mobile: (d.mobile as ContactInfoRow["mobile"]) ?? { display: "", href: "" },
      email: (d.email as ContactInfoRow["email"]) ?? { display: "", href: "" },
      hours: (d.working_hours as ContactInfoRow["hours"]) ?? [],
      map: {
        embed: String(d.map_embed ?? ""),
        route: String(d.map_route ?? ""),
        view: String(d.map_view ?? ""),
        latitude: Number(d.latitude ?? 0),
        longitude: Number(d.longitude ?? 0),
        verified: Boolean(d.is_verified),
      },
      social: (d.social_links as ContactInfoRow["social"]) ?? {},
    };
  }

  async updateContactInfo(patch: Partial<ContactInfoRow>): Promise<ContactInfoRow> {
    const sb = supabaseAdmin();
    const db: Record<string, unknown> = {};
    if (patch.address !== undefined) db.address = patch.address;
    if (patch.phone !== undefined) db.phone = patch.phone;
    if (patch.mobile !== undefined) db.mobile = patch.mobile;
    if (patch.email !== undefined) db.email = patch.email;
    if (patch.hours !== undefined) db.working_hours = patch.hours;
    if (patch.map !== undefined) {
      db.map_embed = patch.map.embed;
      db.map_route = patch.map.route;
      db.map_view = patch.map.view;
      db.latitude = patch.map.latitude;
      db.longitude = patch.map.longitude;
      db.is_verified = patch.map.verified;
    }
    if (patch.social !== undefined) db.social_links = patch.social;
    const { error } = await sb.from("contact_information").update(db).eq("id", 1);
    dbGuard(error, true);
    return this.getContactInfo();
  }
}

export const supabaseContentRepository = new SupabaseContentRepository();
export const supabaseAdminSettingsRepository = new SupabaseAdminSettingsRepository();
