/**
 * SEED.sql generator — src/data (prototip kontent) → supabase/SEED.sql
 *
 * Nima uchun: sandbox tarmog'ida Supabase REST yopiq, lekin SQL Editor ochiq.
 * Bu skript idempotent INSERT'lar generatsiya qiladi (ON CONFLICT DO NOTHING /
 * WHERE NOT EXISTS — mavjud yozuvlar HECH QACHON buzilmaydi).
 *
 * Ishga tushirish:  npm run db:seed:sql   → supabase/SEED.sql fayl yaratadi
 * Qo'llash:         Supabase Dashboard → SQL Editor → paste → Run
 */
import { writeFileSync } from "node:fs";
import { NEWS, NEWS_CATEGORIES } from "../src/data/news";
import { PEOPLE } from "../src/data/people";
import { GALLERY, GALLERY_CATEGORIES } from "../src/data/gallery";
import { FAQS } from "../src/data/faq";
import { STATS } from "../src/data/stats";
import { EDU_FEATURES } from "../src/data/education";
import { FACILITIES } from "../src/data/facilities";
import { QUICK_LINKS } from "../src/data/quicklinks";
import { site } from "../src/data/site";

/** SQL string literal (single-quote escape). */
const q = (s: string): string => `'${s.replace(/'/g, "''")}'`;
/** jsonb literal. */
const jb = (v: unknown): string => `${q(JSON.stringify(v))}::jsonb`;
/** nullable string. */
const ns = (v: string | null | undefined): string => (v === null || v === undefined || v === "" ? "null" : q(v));
const nb = (v: boolean): string => (v ? "true" : "false");

const rows: string[] = [];
const push = (s = "") => rows.push(s);

push(`-- ============================================================================`);
push(`-- 202-MAKTAB — SEED (Phase 3 prototip kontent)`);
push(`-- Qo'llash: Supabase Dashboard → SQL Editor → paste → Run`);
push(`-- Idempotent: mavjud yozuvlar o'chirilmaydi/yozilmaydi (skip-existing).`);
push(`-- MUHIM: jamoa, statistika va boshqa kontent — PROTOTIP ma'lumotlar.`);
push(`-- Real School 202 kontenti Phase 5'da admin panel orqali kiritiladi.`);
push(`-- ============================================================================`);
push();

/* 1. kategoriyalar (FK resolution uchun birinchi) */
push(`-- 1) Kategoriyalar`);
for (const [i, name] of NEWS_CATEGORIES.entries()) {
  push(`insert into news_categories (name, slug, sort_order) values (${q(name)}, ${q(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}, ${i}) on conflict (name) do nothing;`);
}
for (const [i, name] of GALLERY_CATEGORIES.entries()) {
  push(`insert into gallery_categories (name, slug, sort_order) values (${q(name)}, ${q(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}, ${i}) on conflict (name) do nothing;`);
}
push();

/* 2. singletonlar */
push(`-- 2) Sayt sozlamalari (singleton)`);
push(`insert into site_settings (id, school_name, short_name, tagline, description, district, address, established, locale, phone, mobile, email, working_hours, social_links)`);
push(`values (1, ${q(site.name)}, ${q(site.name)}, ${q(site.tagline)}, ${q(site.fullName)}, ${q(site.district)}, ${q(site.address)}, ${q(site.established)}, 'uz', ${jb(site.phone)}, ${jb(site.mobile)}, ${jb(site.email)}, ${jb(site.hours)}, ${jb(site.social)})`);
push(`on conflict (id) do nothing;`);
push();
push(`-- 3) Aloqa ma'lumoti (singleton, PROTOTIP koordinata — Phase 5 tasdiqlaydi)`);
push(`insert into contact_information (id, address, phone, mobile, email, working_hours, latitude, longitude, map_embed, map_route, map_view, is_verified, social_links)`);
push(`values (1, ${q(site.address)}, ${jb(site.phone)}, ${jb(site.mobile)}, ${jb(site.email)}, ${jb(site.hours)}, 41.2797, 69.2404, ${q(site.map.embed)}, ${q(site.map.route)}, ${q(site.map.view)}, false, ${jb(site.social)})`);
push(`on conflict (id) do nothing;`);
push();

/* 4. kolleksiyalar */
push(`-- 4) Statistika (PROTOTIP qiymatlar)`);
for (const [i, s] of STATS.entries()) {
  push(`insert into statistics (id, label, value, suffix, description, icon, sort_order, is_visible) values (${q(s.id)}, ${q(s.label)}, ${s.value}, ${q(s.suffix)}, ${q(s.description)}, ${q(s.icon)}, ${i}, true) on conflict (id) do nothing;`);
}
push();
push(`-- 5) Imkoniyatlar (Ta'lim plitalari)`);
for (const [i, f] of EDU_FEATURES.entries()) {
  push(`insert into features (id, display_index, title, description, icon, image_url, alt, sort_order, is_visible) values (${q(f.id)}, ${q(f.index)}, ${q(f.title)}, ${q(f.description)}, ${q(f.icon)}, ${ns(f.image ?? null)}, ${ns(f.alt ?? null)}, ${i}, true) on conflict (id) do nothing;`);
}
push();
push(`-- 6) Inshootlar (scroll-hikoya)`);
for (const [i, f] of FACILITIES.entries()) {
  push(`insert into facilities (id, kicker, title, description, image_url, image_alt, sort_order, is_visible) values (${q(f.id)}, ${q(f.kicker)}, ${q(f.title)}, ${q(f.description)}, ${q(f.image)}, ${q(f.alt)}, ${i}, true) on conflict (id) do nothing;`);
}
push();
push(`-- 7) Jamoa (PROTOTIP ismlar — hech qachon real deb taqdim etilmaydi)`);
for (const [i, p] of PEOPLE.entries()) {
  push(`insert into team_members (id, full_name, position, subject, category, member_group, experience, photo_url, photo_alt, sort_order, is_visible) values (${q(p.id)}, ${q(p.name)}, ${q(p.role)}, ${ns(p.subject ?? null)}, ${q(p.category)}, ${q(p.group)}, ${q(p.experience)}, ${ns(p.photo || null)}, ${q(p.alt)}, ${i}, true) on conflict (id) do nothing;`);
}
push();
push(`-- 8) Galereya (PROTOTIP media)`);
for (const [i, g] of GALLERY.entries()) {
  push(`insert into gallery_items (id, type, src, poster, alt, category, category_id, album, width, height, sort_order, is_visible) values (${q(g.id)}, ${q(g.type)}, ${q(g.src)}, ${ns(g.poster ?? null)}, ${q(g.alt)}, ${q(g.category)}, (select id from gallery_categories where name = ${q(g.category)}), ${q(g.album)}, ${g.width}, ${g.height}, ${i}, true) on conflict (id) do nothing;`);
}
push();
push(`-- 9) Tez havolalar`);
for (const [i, ql] of QUICK_LINKS.entries()) {
  push(`insert into quick_links (id, title, description, icon, url, open_in_new_tab, sort_order, is_visible) values (${q(ql.id)}, ${q(ql.title)}, ${q(ql.description)}, ${q(ql.icon)}, ${q(ql.href)}, false, ${i}, true) on conflict (id) do nothing;`);
}
push();
push(`-- 10) FAQ (unique constraint yo'q → WHERE NOT EXISTS idempotentlik uchun)`);
for (const [i, f] of FAQS.entries()) {
  push(`insert into faqs (question, answer, sort_order, is_visible) select ${q(f.q)}, ${q(f.a)}, ${i}, true where not exists (select 1 from faqs where question = ${q(f.q)});`);
}
push();
push(`-- 11) Yangiliklar (PROTOTIP tahririy matnlar, published)`);
for (const n of NEWS) {
  push(`insert into news_articles (slug, title, excerpt, content, cover_image, cover_alt, category, category_id, author_name, reading_time, is_published, published_at)`);
  push(`values (${q(n.slug)}, ${q(n.title)}, ${q(n.excerpt)}, ${jb(n.body)}, ${q(n.image)}, ${q(n.alt)}, ${q(n.category)}, (select id from news_categories where name = ${q(n.category)}), null, ${q(n.readingTime)}, true, ${q(`${n.date}T06:00:00Z`)}::timestamptz)`);
  push(`on conflict (slug) do nothing;`);
}
push();

/* 12. tekshiruv so'rovlari — SQL Editor natija gridida ko'rinadi */
push(`-- ============================================================================`);
push(`-- TEKSHIRUV — quyidagi hisobot SQL Editor'da natija sifatida chiqadi:`);
push(`-- ============================================================================`);
push(`select 'jadval (public sxema)' as narsa, count(*)::text as soni from information_schema.tables where table_schema = 'public'`);
push(`union all select 'site_settings', count(*)::text from site_settings`);
push(`union all select 'contact_information', count(*)::text from contact_information`);
push(`union all select 'news_categories', count(*)::text from news_categories`);
push(`union all select 'gallery_categories', count(*)::text from gallery_categories`);
push(`union all select 'statistics', count(*)::text from statistics`);
push(`union all select 'features', count(*)::text from features`);
push(`union all select 'facilities', count(*)::text from facilities`);
push(`union all select 'team_members', count(*)::text from team_members`);
push(`union all select 'gallery_items', count(*)::text from gallery_items`);
push(`union all select 'quick_links', count(*)::text from quick_links`);
push(`union all select 'faqs', count(*)::text from faqs`);
push(`union all select 'news_articles (published)', count(*)::text from news_articles where is_published`);
push(`union all select 'rls yoqilgan jadvallar', count(*)::text from pg_tables where schemaname = 'public' and rowsecurity`);
push(`order by narsa;`);
push();

writeFileSync("supabase/SEED.sql", rows.join("\n") + "\n");
console.log(`supabase/SEED.sql yaratildi (${rows.length} qator)`);
console.log(`  yangiliklar: ${NEWS.length}, jamoa: ${PEOPLE.length}, galereya: ${GALLERY.length}, faq: ${FAQS.length}`);
