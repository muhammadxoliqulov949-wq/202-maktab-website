# DATABASE — Phase 3 (Supabase PostgreSQL)

Faza 3 maqsadi: maktab CMS mazmuni bazadan keladi, admin panel orqali boshqariladi — lekin **sayt va public API xulq-atvori butunlay o‘zgarmagan**.

```
Public sayt  →  /api/v1/*            →  Controller → Service → Repository interfeysi → [json | supabase]
Admin panel  →  /api/v1/admin/*      →  Controller → Service → Repository interfeysi → [json | supabase]
                                                                    ↓
                                                      Supabase PostgreSQL (service-role, server-side)
```

Frontend komponentlar hech qachon Supabase'ga to‘g‘ridan-to‘g‘ri ulanmaydi — faqat o‘z API'si orqali.

---

## 1. Tez o‘rnatish

### 1a. Supabase dashboard orqali (2 paste — sandbox/server tarmog‘i cheklanganda eng oson yo‘l)

> **Tarmoq cheklovi:** ba’zi hosting/sandbox muhitlarida `*.supabase.co`ga chiqish yopiq bo‘ladi. Bunday holda migratsiya+seedni dashboard SQL Editor orqali qo‘llang (kalitlar kerak emas), so‘ng ilova Supabase’ga yetadigan muhitda ishga tushiring.

1. **Migratsiya:** Dashboard → **SQL Editor** → `supabase/APPLY-ALL.sql` kontentini paste → **Run**. Natija: 15 jadval, indekslar, RLS, `media` bucket.
2. **Seed:** SQL Editor → `supabase/SEED.sql` kontentini paste → **Run**. Oxiridagi TEKSHIRUV so‘rovi jadval/ma’lumot sonlarini chiqaradi (kutilgan: 15 jadval, 6 yangilik, 16 jamoa, 13 galereya…).
3. Fayllarni qayta generatsiya qilish: `npm run db:seed:sql` (src/data o‘zgarsa).

### 1b. CLI/lokal yo‘l (Supabase’ga to‘g‘ridan-to‘g‘ri tarmoq bor bo‘lsa)

```bash
# 1) Supabase loyihasi → Settings → API dan URL va service-role key oling
cp .env.example .env.local
#   .env.local ichida:
#   DATA_PROVIDER=supabase
#   SUPABASE_URL=https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# 2) Migratsiyalarni qo‘llash (SQL editor yoki CLI — supabase/README.md)
npm run db:migrate        # fayllar ro‘yxati
#   SQL editor’da tartib bilan: 0001_initial_schema.sql → 0002_rls.sql → 0003_storage.sql

# 3) Seed (idempotent — mavjudlarni buzmaydi)
npm run db:seed:dry       # oldindan ko‘rish
npm run db:seed           # yozadi + hisobot

# 4) Ishga tushirish
npm run build && npm start
```

## 2. Provider almashtirish

| `DATA_PROVIDER` | Xulq-atvor |
|---|---|
| `json` (default) | Xotirada store, `src/data/*` dan urug‘lanadi. Admin panel ishlaydi, lekin o‘zgarishlar restartda yo‘qoladi (dev/preview rejimi). |
| `supabase` | PostgreSQL. Keysiz ishga tushmaslik manifesti: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` bo‘lmasa server startda yiqiladi (fail-fast). |

Kodda farq yo‘q: servislar faqat interfeyslarga bog‘liq (`src/server/repositories/interfaces.ts`), fabrika — `src/server/repositories/index.ts`.

## 3. Sxema (15 jadval)

Jadval ro‘yxati, ID konventsiyalari va indekslar → `supabase/README.md` jadvali. Qisqacha:

- **Singletonlar:** `site_settings` (id=1), `contact_information` (id=1)
- **Text PK (public API mosligi):** `team_members` (p-01…), `gallery_items` (g-01/v-01…), `facilities`, `features`, `statistics`, `quick_links`
- **UUID:** `news_articles` (URL'da slug — raqamli ID yo‘q), `faqs`, `contact_submissions`, `media_assets`
- **Yangilik holati:** `is_published` (draft/published) + `archived_at` (soft delete). Public API faqat `is_published AND archived_at IS NULL` qaytaradi; admin hammasini ko‘radi.
- **Flexibel maydonlar JSONB:** telefon/email `{display,href}`, ish vaqti, social havolalar, yangilik matn bloklari.
- **Cheklovlar:** NOT NULL, UNIQUE (slug, category nomi), CHECK (slug formati, qiymat diapazonlari, status enum), FK (article→category, gallery→category).
- **Indekslar:** real so‘rov yo‘nalishlari bo‘yicha (news: published_at/category/is_published/archived; kolleksiyalar: is_visible+sort_order; submissions: status/created_at; audit: created_at/entity).

## 4. Xavfsizlik — nima himoyalangan (halol)

**Hozir himoyalangan:**
- Barcha jadvallarda RLS yoqilgan, **hech qanday anon policy yo‘q** → anon kalit orqali PostgREST hech narsa o‘qiy olmaydi (default deny).
- Service-role kaliti faqat serverda (`import "server-only"` — client bundle'ga kirsa build xato beradi). Brauzerga hech qachon chiqmaydi.
- `contact_submissions` va `admin_audit_logs` public API'da umuman yo‘q (faqat `/api/v1/admin/*`).
- Public API draft/arxiv ajratishini repositoriyda majburlaydi.
- Admin API dev-token gate: `ADMIN_DEV_TOKEN` bo‘lsa — `x-admin-dev-token` sarlavhasi talab qilinadi; production'da tokensiz admin API **o‘chirilgan** (503).

**Phase 4'da bo‘ladigan (halol ro‘yxat, soxta policy yo‘q):**
- Real autentifikatsiya, sessiyalar, parol siyosati, rollar/ruxsatlar, MFA maslahati
- Admin uchun aniq RLS policy’lar (agar to‘g‘ridan-to‘g‘ri PostgREST admin access kerak bo‘lsa)
- Storage yuklash policy’lari

## 5. Cache integratsiyasi

O‘qish: `Service → Cache (cache-aside) → Repository`. Admin mutatsiyasi: `DB yozuvi → audit → FAQAT o‘z nomlar bo‘yicha invalidatsiya` (butun kesh hech qachon to‘liq to‘kanilmaydi):

| Mutatsiya | Invalidatsiya |
|---|---|
| news create/update/publish/archive/delete | `v1:news*` (list + item) |
| team CRUD/reorder | `v1:team*` |
| gallery CRUD/reorder | `v1:gallery*` |
| faqs | `v1:faqs` |
| facilities / features / statistics / quick-links | mos kalit |
| site settings | `v1:site-config` (+ `v1:contact-info`) |
| contact info | `v1:contact-info` |

## 6. Storage arxitekturasi

- Supabase Storage **`media`** bucket (public read; yozish faqat service-role).
- Bazada `media_assets` — metadata (file_name, storage_path, public_url, mime, size, width/height, duration, alt).
- Yuklash pipeline'i Phase 4/5 — hozir poydevor (bucket + admin media metadata sahifasi). Hozirgi media static URL konventsiyasida (`/images/...`, `/video/...`), hech narsa DB'ga ko‘chirilmagan.

## 7. Sinovlar

```bash
npm run test        # 33 public API + 21 admin test
npm run test:full   # build + testlar
npm run db:seed:dry # seed oldindan ko‘rish
```

Qamrov: gate (401/503), CRUD, draft/public separation, duplicate slug 409, archive/hard delete, reorder, settings/contact-info + cache invalidation ta’siri, murojaatlar (new → inbox, honeypot → spam, status → delete), audit yozuvlari, validatsiya 422.

## 8. Phase 4 talablari (keyingi bosqich uchun tayyorlik)

- `admin_audit_logs.admin_identifier` — hozir `"dev-token"` yoki `null` (soxta identifikator YO‘Q); Phase 4 real auth ID bog‘laydi.
- Admin UI token prompti Phase 4 login sahifasi bilan almasanadi (`/admin` middleware bilan himoyalanadi).
- Redis cache provider va BullMQ queue interfeyslari Phase 2'dan tayyor — kerak bo‘lsa ulanadi.
- Storage yuklash + media_assets metadata yozish — Phase 4/5.
