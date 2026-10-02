# Supabase — 202-maktab (Phase 3)

Reproducible database setup. **Migratsiyalarni qo'lda dashboardda bosib-bosib yaratmang** — faqat shu fayllarni qo'llang.

## Migratsiyalarni qo'llash

### Variant A — Supabase SQL editor (eng tez)
1. Supabase dashboard → loyihangiz → **SQL Editor**.
2. Fayllarni tartib bilan oching va to'liq kontentni paste qilib, Run bosing:
   1. `migrations/0001_initial_schema.sql`
   2. `migrations/0002_rls.sql`
   3. `migrations/0003_storage.sql`

### Variant B — Supabase CLI
```bash
supabase link --project-ref <project-ref>
supabase db push
```

## Migratsiyalar

| Fayl | Nima qiladi |
|---|---|
| `0001_initial_schema.sql` | 15 jadval, CHECK/NOT NULL/UNIQUE/FK constraintlar, indekslar, `updated_at` triggerlari |
| `0002_rls.sql` | Har bir jadvalda RLS yoqiladi, hech qanday anon policy YO'Q (default deny). Server faqat service-role bilan ishlaydi |
| `0003_storage.sql` | `media` public bucket (metadata DB'da, fayllar Storage'da) |

## Qisqa sxema xaritasi

| Jadval | Maqsad | ID konventsiyasi |
|---|---|---|
| `site_settings` | Sayt identikati (singleton id=1) | int 1 |
| `statistics` | Bosh sahifa raqamlari | text (`students`…) |
| `features` | Ta'lim bo'limi plitalari | text (`quality`…) |
| `facilities` | Inshootlar scroll-hikoyasi | text (`classrooms`…) |
| `team_members` | Jamoa (PROTOTIP ma'lumot) | text (`p-01`…) |
| `news_categories` / `news_articles` | Yangiliklar (draft/published/archive) | uuid + unique **slug** (URL'da raqamli ID yo'q) |
| `gallery_categories` / `gallery_items` | Galereya (rasm+video, lightbox) | text (`g-01`, `v-01`) |
| `faqs` | Savol-javoblar | uuid |
| `quick_links` | Tez havolalar | text |
| `contact_information` | Rasmiy aloqa ma'lumoti (singleton) | int 1 |
| `contact_submissions` | **ADMIN-ONLY** murojaatlar inboxi | uuid |
| `media_assets` | Storage metadata (fayl URL'ları) | uuid |
| `admin_audit_logs` | Admin mutatsiya jurnali | bigint identity |

## Xavfsizlik holati (halol)

- **HLozirda himoyalangan:** barcha jadvallar RLS + default-deny (anon kalit hech narsa o'qiy olmaydi); xizmat kaliti faqat server-side (`src/server/repositories/supabase/client.ts` — `server-only`); `contact_submissions` va `admin_audit_logs` umuman public API'da yo'q.
- **Phase 4'da bo'ladi:** real autentifikatsiya, rollar, admin uchun aniq policy'lar, MFA maslahati.

## Keyingi qadam: seed

```bash
cp .env.example .env.local   # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to'ldiring
npm run db:seed              # idempotent: mavjud yozuvlarni o'chirib tashlamaydi
npm run db:seed:dry          # oldindan ko'rish (hech narsa yozmaydi)
```
