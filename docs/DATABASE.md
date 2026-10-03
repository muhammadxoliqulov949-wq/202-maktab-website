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

1. **Migratsiya:** Dashboard → **SQL Editor** → `supabase/APPLY-ALL.sql` kontentini paste → **Run**. Natija: 17 jadval (Phase 3: 15 + Phase 4: `admin_roles`, `admin_users`), indekslar, RLS, `media` bucket.
2. **Seed:** SQL Editor → `supabase/SEED.sql` kontentini paste → **Run**. Oxiridagi TEKSHIRUV so‘rovi jadval/ma’lumot sonlarini chiqaradi (kutilgan: 17 jadval, 6 yangilik, 16 jamoa, 13 galereya… — `npm run verify:migrations` shu sonlarni real PostgreSQL'da tekshiradi).
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
- Admin API: Supabase Auth sessiyasi + `admin_users` (aktivlik) + `admin_roles.permissions` (rol ruxsati) + CSRF double-submit. Har bir handler mustaqil tekshiradi.

**Phase 4'da qo‘shilgan:**
- Real autentifikatsiya (Supabase Auth), HttpOnly sessiya cookie'lari, login rate limiting
- `admin_users` / `admin_roles` — database-backed rol/ruxsat modeli
- Tor RLS policy’lar: `admin_users_select_self`, `admin_roles_select_active_admin`
- Storage policy’lari: `media` bucket'ni yozish/o‘chirish faqat faol admin JWT'si bilan
- `admin_audit_logs` — haqiqiy `admin_user_id` + append-only trigger

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

- Supabase Storage **`media`** bucket: public read; yozish/update/delete faqat **faol admin JWT'si** bilan (`media_admin_write` / `media_admin_update` / `media_admin_delete` policy’lari).
- Bazada `media_assets` — metadata (file_name, storage_path, public_url, mime, size, width/height, duration, alt, `uploaded_by`).
- Yuklash: `POST /api/v1/admin/media` (multipart). MIME allow-list + kengaytma mosligi + 8 MB limit; obyekt yo‘li serverda yaratiladi (`uploads/YYYY/MM/<uuid>.<ext>`), mijoz fayl nomi ishlatilmaydi.
- Hozirgi sayt mediasi static URL konventsiyasida (`/images/...`, `/video/...`) qoladi — hech narsa DB'ga ko‘chirilmagan.

## 7. Sinovlar

```bash
npm run build             # testlar build qilingan serverni ishga tushiradi
npm test                  # 83 test: public API + admin CRUD + Phase 4 auth
npm run verify:supabase   # HAQIQIY Supabase loyihasiga qarshi (CI)
npm run check:secrets     # working tree + git history skaneri
npm run db:seed:dry       # seed oldindan ko‘rish
```

Qamrov: CRUD, draft/public separation, duplicate slug 409, archive/hard delete, reorder, settings/contact-info + cache invalidation ta’siri, murojaatlar (new → inbox, honeypot → spam, status → delete), audit yozuvlari, validatsiya 422, hamda Phase 4 auth: login (200/401/403/422), `/admin` redirect/403, API 401/403, sessiya refresh/logout, CSRF, dev-token regressiyasi.

## 8. Phase 4'da qo‘shilgan jadvallar

| Jadval | Maqsad |
|---|---|
| `admin_roles` | Rol → `permissions text[]` katalogi. `admin` roli seeded. Yangi rol qo‘shish = `INSERT`, kod o‘zgarmaydi |
| `admin_users` | `auth.users.id` ↔ rol + `is_active` + `last_login_at`. Parol saqlanmaydi |

`admin_audit_logs`ga qo‘shildi: `admin_user_id uuid`, `admin_email text`, `ip_address text`
(eski `admin_identifier` ustuni Phase 3 yozuvlari uchun saqlanib qolgan). UPDATE/DELETE trigger bilan taqiqlangan.

Batafsil autentifikatsiya/RLS hujjati: [`AUTH.md`](AUTH.md).
