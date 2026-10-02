/**
 * Phase 3 seed/import — src/data (JSON/TS prototype content) → Supabase.
 *
 * Xavfsizlik qoidalari:
 *  - Mavjud yozuvlar HECH QACHON jim o‘chirilmaydi/yozilmaydi:
 *      default:  ignoreDuplicates (mavjudlarni o‘tkazib yuboradi)
 *      --force:  mavjudlarni seed qiymatlari bilan yangilaydi (bilingan!)
 *  - Idempotent: qayta ishga tushirish xavfsiz.
 *  - Har bir jadval bo‘yicha hisobot: yozildi / o‘tkazildi / xato.
 *  - PROTOTIP ma’lumotlar o‘z holaticha ko‘chiriladi — real deb taqdim etilmaydi.
 *
 * Ishga tushirish:
 *   npm run db:seed          (yozadi)
 *   npm run db:seed:dry      (hech narsa yozmaydi, faqat hisobot)
 * Muhit: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local dan o‘qiladi)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { NEWS, NEWS_CATEGORIES } from "../src/data/news";
import { PEOPLE } from "../src/data/people";
import { GALLERY, GALLERY_CATEGORIES } from "../src/data/gallery";
import { FAQS } from "../src/data/faq";
import { STATS } from "../src/data/stats";
import { EDU_FEATURES } from "../src/data/education";
import { FACILITIES } from "../src/data/facilities";
import { QUICK_LINKS } from "../src/data/quicklinks";
import { site } from "../src/data/site";

const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

// --- .env.local yuklash (Next tashqarisida ishlaymiz) ---
function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] === undefined) {
      process.env[key] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

const SUPA_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA_URL || !KEY) {
  console.error("✗ SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kerak (.env.local). Dashboard → Settings → API.");
  process.exit(1);
}

const sb = createClient(SUPA_URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

type Report = { table: string; inserted: number; skipped: number; failed: number };
const report: Report[] = [];

async function seedTable(table: string, rows: Array<Record<string, unknown>>, conflictKey: string): Promise<void> {
  const entry: Report = { table, inserted: 0, skipped: 0, failed: 0 };

  if (rows.length === 0) {
    report.push(entry);
    return;
  }

  // Existing keys — idempotency uchun
  const { data: existing, error: selErr } = await sb.from(table).select(conflictKey);
  if (selErr) {
    console.error(`  ✗ ${table}: ${selErr.message}`);
    entry.failed = rows.length;
    report.push(entry);
    return;
  }
  const existingKeys = new Set(
    ((existing ?? []) as unknown as Array<Record<string, unknown>>).map((r) => String(r[conflictKey]))
  );

  const fresh = rows.filter((r) => !existingKeys.has(String(r[conflictKey])));
  entry.skipped = rows.length - fresh.length;

  if (DRY) {
    entry.inserted = fresh.length;
    report.push(entry);
    return;
  }

  if (fresh.length > 0) {
    const { error } = await sb.from(table).insert(fresh);
    if (error) {
      console.error(`  ✗ ${table}: ${error.message}`);
      entry.failed = fresh.length;
    } else {
      entry.inserted = fresh.length;
    }
  }

  if (FORCE && entry.failed === 0) {
    // --force: mavjud yozuvlarni seed qiymatlari bilan yangilash (ogohlantirilgan)
    for (const row of rows) {
      const key = String(row[conflictKey]);
      const { id, ...rest } = row as Record<string, unknown> & { id?: unknown };
      const { error } = await sb.from(table).update(rest).eq(conflictKey, id ?? key);
      if (error) {
        console.error(`  ✗ ${table}[${key}]: ${error.message}`);
        entry.failed++;
      }
    }
  }

  report.push(entry);
}

const now = new Date().toISOString();

async function main(): Promise<void> {
  console.log(`\n202-maktab seed → ${new URL(SUPA_URL!).host} ${DRY ? "(DRY-RUN — yozilmaydi)" : FORCE ? "(--FORCE — mavjudlar yangilanadi!)" : "(skip-existing)"}\n`);

  /* 1. singletonlar */
  await seedTable(
    "site_settings",
    [
      {
        id: 1,
        school_name: site.name,
        short_name: site.name,
        tagline: site.tagline,
        description: site.fullName,
        district: site.district,
        address: site.address,
        established: site.established,
        locale: "uz",
        phone: { ...site.phone },
        mobile: { ...site.mobile },
        email: { ...site.email },
        working_hours: site.hours.map((h) => ({ ...h })),
        social_links: { ...site.social },
      },
    ],
    "id"
  );

  await seedTable(
    "contact_information",
    [
      {
        id: 1,
        address: site.address,
        phone: { ...site.phone },
        mobile: { ...site.mobile },
        email: { ...site.email },
        working_hours: site.hours.map((h) => ({ ...h })),
        latitude: 41.2797,
        longitude: 69.2404,
        map_embed: site.map.embed,
        map_route: site.map.route,
        map_view: site.map.view,
        is_verified: false, // PROTOTIP koordinata — Phase 5 tasdiqlaydi
        social_links: { ...site.social },
      },
    ],
    "id"
  );

  /* 2. kategoriyalar */
  await seedTable(
    "news_categories",
    NEWS_CATEGORIES.map((name, i) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), sort_order: i })),
    "name"
  );
  await seedTable(
    "gallery_categories",
    GALLERY_CATEGORIES.map((name, i) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), sort_order: i })),
    "name"
  );

  /* 3. kolleksiyalar (PROTOTIP belgisi bilan) */
  await seedTable(
    "statistics",
    STATS.map((s, i) => ({
      id: s.id,
      label: s.label,
      value: s.value,
      suffix: s.suffix,
      description: s.description,
      icon: s.icon,
      sort_order: i,
      is_visible: true,
    })),
    "id"
  );

  await seedTable(
    "features",
    EDU_FEATURES.map((f, i) => ({
      id: f.id,
      display_index: f.index,
      title: f.title,
      description: f.description,
      icon: f.icon,
      image_url: f.image ?? null,
      alt: f.alt ?? null,
      sort_order: i,
      is_visible: true,
    })),
    "id"
  );

  await seedTable(
    "facilities",
    FACILITIES.map((f, i) => ({
      id: f.id,
      kicker: f.kicker,
      title: f.title,
      description: f.description,
      image_url: f.image,
      image_alt: f.alt,
      sort_order: i,
      is_visible: true,
    })),
    "id"
  );

  await seedTable(
    "team_members",
    PEOPLE.map((p, i) => ({
      id: p.id,
      full_name: p.name,
      position: p.role,
      subject: p.subject ?? null,
      category: p.category,
      member_group: p.group,
      experience: p.experience,
      photo_url: p.photo || null,
      photo_alt: p.alt,
      sort_order: i,
      is_visible: true,
    })),
    "id"
  );

  await seedTable(
    "gallery_items",
    GALLERY.map((g, i) => ({
      id: g.id,
      type: g.type,
      src: g.src,
      poster: g.poster ?? null,
      alt: g.alt,
      caption: null,
      category: g.category,
      album: g.album,
      width: g.width,
      height: g.height,
      sort_order: i,
      is_visible: true,
    })),
    "id"
  );

  await seedTable(
    "quick_links",
    QUICK_LINKS.map((q, i) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      icon: q.icon,
      url: q.href,
      open_in_new_tab: false,
      sort_order: i,
      is_visible: true,
    })),
    "id"
  );

  await seedTable(
    "faqs",
    FAQS.map((f, i) => ({
      // uuid emas — deterministik key sifatida question ishlatiladi (idempotentlik)
      question: f.q,
      answer: f.a,
      sort_order: i,
      is_visible: true,
    })),
    "question"
  );

  /* 4. yangiliklar (PROTOTIP tahririy matnlar) */
  const { data: cats } = await sb.from("news_categories").select("id,name");
  const catId = (name: string): string | null => ((cats ?? []) as Array<{ id: string; name: string }>).find((c) => c.name === name)?.id ?? null;

  await seedTable(
    "news_articles",
    NEWS.map((n) => ({
      slug: n.slug,
      title: n.title,
      excerpt: n.excerpt,
      content: n.body,
      cover_image: n.image,
      cover_alt: n.alt,
      category: n.category,
      category_id: catId(n.category),
      author_name: null,
      reading_time: n.readingTime,
      is_published: true,
      published_at: new Date(`${n.date}T06:00:00Z`).toISOString(),
    })),
    "slug"
  );

  /* hisobot */
  console.log("\n┌─ HISOBOT " + "─".repeat(46));
  let ti = 0,
    ts = 0,
    tf = 0;
  for (const r of report) {
    console.log(`│ ${r.table.padEnd(24)} yozildi: ${String(r.inserted).padStart(3)}   o‘tkazildi: ${String(r.skipped).padStart(3)}   xato: ${r.failed}`);
    ti += r.inserted;
    ts += r.skipped;
    tf += r.failed;
  }
  console.log(`└${"─".repeat(58)}`);
  console.log(`  JAMI: ${ti} yozildi · ${ts} allaqachon bor · ${tf} xato\n`);

  if (!DRY) {
    console.log("  Eslatma: jamoa/statistika/inshootlar — PROTOTIP ma’lumotlar.");
    console.log("  Real School 202 kontenti Phase 5’da admin panel orqali kiritiladi.\n");
  }

  if (tf > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Seed xatosi:", e instanceof Error ? e.message : e);
  process.exit(1);
});
