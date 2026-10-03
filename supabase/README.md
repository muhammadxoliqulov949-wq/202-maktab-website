# Supabase — 202-maktab (Phase 3 + Phase 4)

Reproducible database setup. **Migratsiyalarni qo'lda dashboardda bosib-bosib yaratmang** — faqat shu fayllarni qo'llang.

## Migratsiyalarni qo'llash

### Variant A — Supabase SQL editor (eng tez)
1. Supabase dashboard → loyihangiz → **SQL Editor**.
2. Fayllarni tartib bilan oching va to'liq kontentni paste qilib, Run bosing:
   1. `migrations/0001_initial_schema.sql`
   2. `migrations/0002_rls.sql`
   3. `migrations/0003_storage.sql`
   4. `migrations/0004_auth.sql`  ← Phase 4 (admin_users, admin_roles, audit identiteti, Storage policy'lari)

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
| `0004_auth.sql` | `admin_roles` (rol→ruxsatlar), `admin_users` (auth.users ↔ rol), `admin_audit_logs`ga `admin_user_id/admin_email/ip_address` + append-only trigger, `media_assets.uploaded_by`, RLS policy'lari va Storage write policy'lari |

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
| `admin_audit_logs` | Admin mutatsiya jurnali (append-only, trigger bilan himoyalangan) | bigint identity |
| `admin_roles` | Rol → ruxsatlar katalogi (`admin` seeded) | text (`admin`) |
| `admin_users` | **ADMIN-ONLY** — `auth.users.id` ↔ rol/aktivlik | uuid |

## Xavfsizlik holati (Phase 4 dan keyin)

- **Autentifikatsiya:** Supabase Auth (email + parol). Parollar hech qayerda saqlanmaydi — faqat GoTrue'da.
- **Awtorizatsiya:** `admin_users` (aktivlik) + `admin_roles.permissions` (rol → ruxsatlar). Har bir `/api/v1/admin/*` handler'i mustaqil tekshiradi.
- **RLS:** barcha jadvallar default-deny. Qo'shimcha tor policy'lar:
  - `admin_users_select_self` — foydalanuvchi faqat O'Z yozuvini o'qiy oladi;
  - `admin_roles_select_active_admin` — katalog faqat faol adminlarga ko'rinadi;
  - `storage.objects`: `media` bucket'ni hamma o'qiy oladi, yozish/o'chirish faqat faol admin JWT'si bilan.
- **Service-role kalit:** faqat server-side (`src/lib/supabase/service.ts` — `server-only` import build xatosiga olib keladi). Nima uchun har bir holatda ishlatilishi `docs/AUTH.md §2.1`da yozilgan.
- **Append-only:** `admin_audit_logs`da UPDATE/DELETE trigger bilan taqiqlangan.

## Birinchi adminni yaratish

```bash
# .env.local'da SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY bo'lsin
node scripts/admin-user.mjs create --email siz@202-maktab.uz --role admin
node scripts/admin-user.mjs list
node scripts/admin-user.mjs deactivate --user-id <uuid>   # darhol 403
```

Batafsil: `docs/AUTH.md §6`.

## Keyingi qadam: seed

```bash
cp .env.example .env.local   # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to'ldiring
npm run db:seed              # idempotent: mavjud yozuvlarni o'chirib tashlamaydi
npm run db:seed:dry          # oldindan ko'rish (hech narsa yozmaydi)
```
