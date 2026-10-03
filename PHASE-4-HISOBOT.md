# PHASE 4 HISOBOT — Real Authentication, Authorization & Admin Security

**Branch:** `arena/01a101bc-202-maktab-website` · **PR:** [#3](https://github.com/muhammadxoliqulov949-wq/202-maktab-website/pull/3)
**Holat:** kod tayyor, barcha lokal tekshiruvlar o'tdi. **Bitta operator qadami qoldi** — `0004_auth.sql` real Supabase loyihasiga qo'llanishi kerak (§11).

---

## 1. Autentifikatsiya arxitekturasi

```
Supabase Auth (GoTrue)
      │  signInWithPassword — server tomonida, anon apikey bilan
      ▼
POST /api/v1/auth/login            (rate limit: IP + email, umumiy xato xabari, audit)
      │  Set-Cookie
      ▼
HttpOnly sessiya cookie (m202_session)
      │
      ▼
src/middleware.ts                  (sessiyani yangilaydi, /admin → /admin/login)
      │
      ▼
Route protection
   • /admin/*        → (panel)/layout.tsx server gate (forbidden() → haqiqiy 403)
   • /api/v1/admin/* → requireAdminActor() — HAR BIR handler'da
      │
      ▼
Rol + ruxsat (admin_users.role → admin_roles.permissions)
      │
      ▼
Repositories → PostgreSQL (RLS) → admin_audit_logs
```

**Uchta Supabase client — aniq ajratilgan:**

| Modul | Kalit | Vazifa |
|---|---|---|
| `src/lib/supabase/browser.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Brauzer client'i. `persistSession: false` — sessiya cookie'si HttpOnly bo'lgani uchun u **haqiqat manbai emas** |
| `src/lib/supabase/server.ts` | anon (bo'lmasa service, warning bilan) | `@supabase/ssr` cookie adapteri: `signInWithPassword`, `getUser`, `refreshSession`, `signOut` |
| `src/lib/supabase/service.ts` | `SUPABASE_SERVICE_ROLE_KEY` | `import "server-only"` — client bundle'ga kirsa **build xatosi** |

Sessiya cookie'lari: `m202_session` (HttpOnly, SameSite=Lax, Secure, Path=/) va
`m202_csrf` (JS o'qiy oladi — double-submit uchun ataylab). Token hech qachon javob
tanasi, `localStorage` yoki client bundle'da chiqmaydi.

## 2. Awtorizatsiya modeli

`admin_roles(role, permissions[])` + `admin_users(auth.users.id → role, is_active, last_login_at)`.
Handler'lar **rol nomini emas, ruxsatni** so'raydi — yangi rol qo'shish `INSERT`, kod o'zgarmaydi.

`requireAdminActor()` har bir `/api/v1/admin/*` handler'ida mustaqil ishlaydi:

1. sessiya cookie → `supabase.auth.getUser()` (GoTrue'da tekshiriladi, JWT decode emas) → **401**
2. CSRF double-submit (faqat POST/PUT/PATCH/DELETE) → **403 `CSRF_FAILED`**
3. `admin_users` yozuvi bor → **403**
4. `is_active = true` → **403**
5. `admin_roles.permissions` kerakli ruxsatni o'z ichiga oladi → **403**

`/admin` sahifasi: anonim → `/admin/login`ga redirect; sessiyasi bor, lekin admin emas →
`forbidden()` orqali **haqiqiy HTTP 403** (`src/app/forbidden.tsx`).

## 3. Ma'lumotlar bazasi / RLS o'zgarishlari

`supabase/migrations/0004_auth.sql` (idempotent, `supabase/APPLY-ALL.sql`ga ham qo'shilgan):

- `admin_roles` — `admin` roli seeded (11 ta ruxsat)
- `admin_users` — `user_id` (unique, `auth.users`ga FK, cascade), `email`, `role`, `is_active`, `last_login_at`, `updated_at` triggeri
- `admin_audit_logs` += `admin_user_id uuid`, `admin_email text`, `ip_address text` + **append-only trigger** (UPDATE/DELETE taqiqlangan)
- `media_assets` += `uploaded_by`
- RLS: `admin_users_select_self`, `admin_roles_select_active_admin`
- Storage: `media_public_read`, `media_admin_write`, `media_admin_update`, `media_admin_delete`

Phase 3 default-deny modeli **saqlangan** — public o'qishlar `/api/v1/*` orqali.
Service-role kalitining har bir ishlatilishi `docs/AUTH.md §2.1`da asoslangan.

## 4. O'zgargan fayllar

**Yangi (18):** `src/middleware.ts`, `src/lib/supabase/{env,browser,server,service}.ts`,
`src/server/auth/{actor,csrf,permissions}.ts`, `src/server/services/{auth,audit,media.service,adminUsers.service}.ts`,
`src/server/controllers/auth.ts`, `src/server/validation/authSchemas.ts`,
`src/server/http/requestContext.ts`, `src/server/repositories/supabase/adminUsers.repository.ts`,
`src/app/api/v1/auth/{login,logout,session}/route.ts`,
`src/app/api/v1/admin/admin-users/{route.ts,[id]/route.ts}`, `src/app/api/v1/admin/media/[id]/route.ts`,
`src/app/admin/login/page.tsx`, `src/app/forbidden.tsx`,
`src/components/admin/{LoginForm,AdminForbidden}.tsx`,
`supabase/migrations/0004_auth.sql`, `docs/AUTH.md`,
`scripts/{admin-user,check-secrets,apply-migration}.mjs`, `tests/auth.test.mjs`,
`tests/helpers/{mock-supabase-auth,server}.mjs`

**O'zgartirilgan:** `src/server/config/env.ts`, `src/server/services/admin.service.ts`,
`src/server/controllers/admin.ts`, `src/server/http/handler.ts`, `src/server/errors/AppError.ts`,
`src/server/types/api.ts`, `src/server/repositories/*` (types, interfaces, index, store, json + supabase repos),
`src/server/openapi.ts`, `src/server/middleware/rateLimit.ts`, `src/instrumentation.ts`,
`next.config.ts`, `src/components/admin/{client.ts,AdminShell.tsx}`,
`src/app/admin/**` → `src/app/admin/(panel)/**` (route group), audit va media sahifalari,
`package.json`, `.env.example`, `.github/workflows/verify-supabase.yml`,
`supabase/{APPLY-ALL.sql,README.md}`, `docs/{API,DATABASE}.md`, `README.md`, `tests/admin.test.mjs`

## 5. Dev-token o'chirilishi — tasdiqlangan

Olib tashlandi: `ADMIN_DEV_TOKEN`, `x-admin-dev-token` tekshiruvi, `localStorage` kaliti,
token prompt dialogi, "DEVELOPMENT ONLY" banner.

Tasdiqlovchi tekshiruvlar:
- `F1` — eski header bilan `/api/v1/admin/*` → **401**, `/admin` → redirect
- `F2` — `src/`, `scripts/`, `supabase/` ichida `ADMIN_DEV_TOKEN` / `x-admin-dev-token` / `m202-admin-dev-token` qoldig'i yo'qligini grep qiladi
- `scripts/check-secrets.mjs` — working tree **+ git history** (CI'da majburiy qadam)

## 6. Xavfsizlik choralari

- **CSRF:** double-submit token (`m202_csrf` ↔ `x-csrf-token`, timing-safe). `SameSite=Lax` yolg'iz yetarli deb hisoblanmadi — sabab `docs/AUTH.md §2.4`da.
- **Login:** rate limit IP **va** email bo'yicha (default 10/60s); barcha muvaffaqiyatsizliklar uchun bitta umumiy xabar; user enumeration yo'q; texnik tafsilotlar faqat server logida.
- **Audit:** haqiqiy `admin_user_id`; append-only (trigger); `password/token/secret/apikey/...` kalitlari metadata'dan avtomatik o'chiriladi; muvaffaqiyatsiz login'larda email hash ko'rinishida.
- **Media:** `media.write`; MIME allow-list; kengaytma↔MIME mosligi; 8 MB limit; obyekt yo'li serverda yaratiladi; Storage yozuvi admin'ning o'z JWT'si bilan (RLS hal qiladi).
- **Cache:** autentifikatsiyalangan javoblar `private, no-store`; cookie yozadigan javoblar hech qachon CDN'da saqlanmaydi.
- **CSP:** `connect-src` faqat brauzer auth client'i yoqilgan bo'lsa kengayadi.

## 7. Testlar

| Buyruq | Natija |
|---|---|
| `node scripts/check-secrets.mjs` | ✅ o'tdi (lokal + CI) |
| `npm run build` | ✅ o'tdi (lokal + CI), Middleware 109 kB |
| `npm test` | ✅ **83/83** (public API 21 + admin CRUD 31 + **Phase 4 auth 31**) |

Yangi `tests/auth.test.mjs` qamrovi: login (200/401/403/422, enumeration yo'q, cookie flaglari),
`/admin` sahifa himoyasi (redirect / 403 / 403 / 200), API (401/403/403/200 — to'g'ridan-to'g'ri so'rovlar),
sessiya persistence, **haqiqiy token refresh**, logout bekor qilishi, revoked sessiya,
audit user id + sir yo'qligi, dev-token regressiyasi, CSRF, client bundle gigiyenasi, public regressiya.

> Lokal testlar `tests/helpers/mock-supabase-auth.mjs` (GoTrue double) bilan ishlaydi.
> U **faqat `tests/` ichida**, Next bundle'ga kirmaydi va production'da mavjud emas.
> Ilova token'larni baribir HTTP orqali tekshiradi — hech qanday auth bypass yo'q.

## 8. Build natijasi

✅ `next build` muvaffaqiyatli. `src/instrumentation.ts` edge-safe qilingan (middleware
qo'shilgach Next uning edge variantini ham kompilyatsiya qiladi), `forbidden()` uchun
`experimental.authInterrupts` yoqilgan.

## 9. Real Supabase tekshiruvi natijasi

CI run [#37126408501](https://github.com/muhammadxoliqulov949-wq/202-maktab-website/actions/runs/37126408501):

| Qadam | Natija |
|---|---|
| Secret scan (tree + git history) | ✅ |
| Build | ✅ |
| Test (83) | ✅ |
| Verify (real Supabase) | ⚠️ **Phase 4 qismi o'tmadi — sabab §11** |

Muvaffaqiyatsiz tekshiruvlarning **barchasi** bitta sababga borib taqaladi:

```
jadval: admin_users  — REST xato (404)
jadval: admin_roles  — REST xato (404)
admin_users jadvali mavjud — HTTP 404
login (admin) → 200 — HTTP 503   (admin_users yo'q → dbGuard 503)
```

Ya'ni `0004_auth.sql` real loyihaga qo'llanmagan. Phase 3 tekshiruvlari (server ishga
tushishi, public API, tezlik) ro'yxatda yo'q — ular o'tgan.

## 10. Git

- **Branch:** `arena/01a101bc-202-maktab-website` (main'dan; force-push/reset yo'q)
- **Commit'lar:** `2efb82a` (auth core) → `18ffabe` (testlar + verification) → `7a7525a` (docs) → `1b7c302` (env fix + migration helper)
- **PR:** [#3](https://github.com/muhammadxoliqulov949-wq/202-maktab-website/pull/3) — **merge qilinmagan**

## 11. Qolgan yagona to'siq va cheklovlar

**Majburiy (bitta qadam):** `0004_auth.sql`ni real loyihaga qo'llash.

```
Variant A: Supabase dashboard → SQL Editor → supabase/migrations/0004_auth.sql → Run
Variant B: repo secret'lariga SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF qo'shing
           (verify skript migratsiyani o'zi qo'llaydi; npm run db:migrate:apply — lokal)
```

Keyin `Verify Supabase` workflow'ini qayta ishga tushiring — qolgan barcha tekshiruv shu.

**Tavsiya:** Settings → Secrets'ga `SUPABASE_ANON_KEY` qo'shing. Bo'lmasa server auth
chaqiruvlari uchun service-key fallback'iga o'tadi (bir marta warning log qiladi) va
anon-kalit bilan RLS tekshiruvlari o'tkazib yuboriladi.

**Ma'lum cheklovlar (halol ro'yxat):**
- `admin_audit_logs` append-only trigger'i `postgres`/`supabase_admin` rollarini istisno qiladi (operator maintenance uchun). Service-role kaliti bilan tekshirib bo'lmaydi — boshqa rol kerak.
- Rate limiter har instance uchun xotirada (Phase 2 holati); bir nechta replika ortida limitlar ko'payadi. Redis adapter interfeysi tayyor.
- Media metadata (`media_assets`) service-role bilan yoziladi; Storage obyekti esa admin JWT'si bilan.
- MFA Phase 4 doirasiga kiritilmagan — Supabase Auth tomonida yoqiladi.
