import type { ContentRepository } from "@/server/repositories/interfaces";
import { getStore } from "@/server/repositories/store";
import {
  toContactInfoDto,
  toFacilityItem,
  toFaqItem,
  toFeatureItem,
  toQuickLinkItem,
  toSiteConfigDto,
  toStatItem,
} from "@/server/repositories/mappers";

/**
 * Static content repository (JSON provider) — reads the in-memory store so
 * admin edits (DATA_PROVIDER=json) are reflected after cache invalidation.
 */
class JsonContentRepository implements ContentRepository {
  async siteConfig() {
    return toSiteConfigDto(getStore().settings);
  }

  async stats() {
    const items = getStore().stats.filter((s) => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder).map(toStatItem);
    return { items, count: items.length };
  }

  async features() {
    const items = getStore().features.filter((f) => f.isVisible).sort((a, b) => a.sortOrder - b.sortOrder).map(toFeatureItem);
    return { items, count: items.length };
  }

  async facilities() {
    const items = getStore().facilities.filter((f) => f.isVisible).sort((a, b) => a.sortOrder - b.sortOrder).map(toFacilityItem);
    return { items, count: items.length };
  }

  async faqs() {
    const items = getStore().faqs.filter((f) => f.isVisible).sort((a, b) => a.sortOrder - b.sortOrder).map(toFaqItem);
    return { items, count: items.length };
  }

  async quickLinks() {
    const items = getStore().quickLinks.filter((q) => q.isVisible).sort((a, b) => a.sortOrder - b.sortOrder).map(toQuickLinkItem);
    return { items, count: items.length };
  }

  async contactInfo() {
    return toContactInfoDto(getStore().contactInfo);
  }
}

export const jsonContentRepository = new JsonContentRepository();
