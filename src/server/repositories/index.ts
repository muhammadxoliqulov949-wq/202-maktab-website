import "server-only";
import { getEnv } from "@/server/config/env";
import { logger } from "@/server/observability/logger";
import type { DataProviders } from "@/server/repositories/interfaces";

import { jsonNewsRepository, jsonAdminNewsRepository } from "@/server/repositories/json/news.repository";
import { jsonTeamRepository } from "@/server/repositories/json/team.repository";
import { jsonGalleryRepository } from "@/server/repositories/json/gallery.repository";
import { jsonContentRepository } from "@/server/repositories/json/content.repository";
import {
  jsonAdminFaqRepository,
  jsonAdminFacilityRepository,
  jsonAdminFeatureRepository,
  jsonAdminGalleryRepository,
  jsonAdminQuickLinkRepository,
  jsonAdminSettingsRepository,
  jsonAdminStatRepository,
  jsonAdminTeamRepository,
  jsonAdminUserRepository,
  jsonAuditRepository,
  jsonSubmissionsRepository,
} from "@/server/repositories/json/admin.repositories";

import { supabaseNewsRepository, supabaseAdminNewsRepository } from "@/server/repositories/supabase/news.repository";
import { supabaseTeamRepository, supabaseAdminTeamRepository } from "@/server/repositories/supabase/team.repository";
import { supabaseGalleryRepository, supabaseAdminGalleryRepository } from "@/server/repositories/supabase/gallery.repository";
import { supabaseContentRepository, supabaseAdminSettingsRepository } from "@/server/repositories/supabase/content.repository";
import {
  supabaseAdminFacilityRepository,
  supabaseAdminFaqRepository,
  supabaseAdminFeatureRepository,
  supabaseAdminQuickLinkRepository,
  supabaseAdminStatRepository,
  supabaseAuditRepository,
  supabaseSubmissionsRepository,
} from "@/server/repositories/supabase/collections.repository";
import { supabaseAdminUserRepository } from "@/server/repositories/supabase/adminUsers.repository";

/**
 * Controlled data-provider switch (Phase 3).
 *
 *   DATA_PROVIDER=json     → in-memory store seeded from src/data (dev/preview).
 *                            Real CRUD, but per-process memory.
 *   DATA_PROVIDER=supabase → PostgreSQL via Supabase (service role, server-side).
 *
 * Services/controllers depend ONLY on the interfaces — they never import
 * provider modules directly, so switching requires no code changes.
 */
const jsonProviders: DataProviders = {
  news: jsonNewsRepository,
  team: jsonTeamRepository,
  gallery: jsonGalleryRepository,
  content: jsonContentRepository,
  submissions: jsonSubmissionsRepository,
  audit: jsonAuditRepository,
  adminUsers: jsonAdminUserRepository,
  adminNews: jsonAdminNewsRepository,
  adminTeam: jsonAdminTeamRepository,
  adminGallery: jsonAdminGalleryRepository,
  adminFaqs: jsonAdminFaqRepository,
  adminFacilities: jsonAdminFacilityRepository,
  adminFeatures: jsonAdminFeatureRepository,
  adminStats: jsonAdminStatRepository,
  adminQuickLinks: jsonAdminQuickLinkRepository,
  adminSettings: jsonAdminSettingsRepository,
};

const supabaseProviders: DataProviders = {
  news: supabaseNewsRepository,
  team: supabaseTeamRepository,
  gallery: supabaseGalleryRepository,
  content: supabaseContentRepository,
  submissions: supabaseSubmissionsRepository,
  audit: supabaseAuditRepository,
  adminUsers: supabaseAdminUserRepository,
  adminNews: supabaseAdminNewsRepository,
  adminTeam: supabaseAdminTeamRepository,
  adminGallery: supabaseAdminGalleryRepository,
  adminFaqs: supabaseAdminFaqRepository,
  adminFacilities: supabaseAdminFacilityRepository,
  adminFeatures: supabaseAdminFeatureRepository,
  adminStats: supabaseAdminStatRepository,
  adminQuickLinks: supabaseAdminQuickLinkRepository,
  adminSettings: supabaseAdminSettingsRepository,
};

export function repos(): DataProviders {
  const env = getEnv();
  if (env.DATA_PROVIDER === "supabase") return supabaseProviders;
  return jsonProviders;
}

/** Boot-time log line so operators can see which provider is live. */
export function logDataProvider(): void {
  const env = getEnv();
  logger.info("data_provider", { provider: env.DATA_PROVIDER });
}
