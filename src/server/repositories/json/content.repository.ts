import { site } from "@/data/site";
import { STATS } from "@/data/stats";
import { EDU_FEATURES } from "@/data/education";
import { FACILITIES } from "@/data/facilities";
import { FAQS } from "@/data/faq";
import { QUICK_LINKS } from "@/data/quicklinks";
import type { ContentRepository } from "@/server/repositories/interfaces";

/**
 * Static content repository — single source of truth remains the Phase 1
 * content modules (src/data/*). Map components receive lat/lng via
 * contact-info so a future DB can supply verified coordinates without
 * redesigning the map UI.
 */
class JsonContentRepository implements ContentRepository {
  async siteConfig() {
    return {
      name: site.name,
      fullName: site.fullName,
      tagline: site.tagline,
      district: site.district,
      address: site.address,
      established: site.established,
      locale: "uz",
      social: site.social,
    };
  }

  async stats() {
    return { items: STATS, count: STATS.length };
  }

  async features() {
    return { items: EDU_FEATURES, count: EDU_FEATURES.length };
  }

  async facilities() {
    return { items: FACILITIES, count: FACILITIES.length };
  }

  async faqs() {
    return { items: FAQS, count: FAQS.length };
  }

  async quickLinks() {
    return { items: QUICK_LINKS, count: QUICK_LINKS.length };
  }

  async contactInfo() {
    return {
      address: site.address,
      phone: site.phone,
      mobile: site.mobile,
      email: site.email,
      hours: site.hours,
      map: {
        latitude: 41.2797,
        longitude: 69.2404,
        embed: site.map.embed,
        route: site.map.route,
        view: site.map.view,
        verified: false, // Phase 5 replaces with verified coordinates
      },
      social: site.social,
    };
  }
}

export const jsonContentRepository = new JsonContentRepository();
