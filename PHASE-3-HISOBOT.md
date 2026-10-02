# PHASE 3 HISOBOT — Database + Admin CMS + Real CRUD Foundation

Sana: 2026-10-02 · Filial: `arena/01a0ee94-202-maktab-website` · Baza: Phase 2 (`5145b88`) + storytelling (`86d5037`)

---

## 1. Joriy commit
Commitlar (tartibi bilan, force yo‘q):
- `21350f3` — Phase 3: database schema (migratsiyalar, constraintlar, indekslar, RLS)
- `fe3da2f` — Phase 3: repository integration (Supabase provider, switch, cache invalidation)
- `c992a11` — Phase 3: admin API (CRUD, inbox, audit, dev-token gate) + 21 test
- `7104afb` — Phase 3: admin CMS (dashboard, editor, kolleksiyalar, inbox, audit UI)
- *(ushbu commit)* — seed skript, hujjatlar, hisobot

## 2. Supabase ulanish holati
**Kutilmoqda** — foydalanuvchi loyiha ochib kalitlarni berishi bilan 1 daqiqada ulanadi. Hammasi tayyor: migratsiya SQL’lari, seed skript, `DATA_PROVIDER=supabase` rejimi, fail-fast env validatsiyasi. Hozir sandbox `DATA_PROVIDER=json` (xotira) rejimida to‘liq ishlaydi. Supabase kalitlari hech qachon repozitoriyga kirmaydi (`.env*` gitignore’da).

## 3. Jadval (15 ta)
`site_settings`¹ · `statistics` · `features` · `facilities` · `team_members` · `news_categories` · `news_articles` · `gallery_categories` · `gallery_items` · `faqs` · `quick_links` · `contact_information`¹ · `contact_submissions`² · `media_assets` · `admin_audit_logs`²
¹ singleton id=1 · ² ADMIN-ONLY, public API’da yo‘q

## 4. Indekslar
news: `published_at DESC`, `category_id`, `is_published`, `archived_at`, unique `slug` · team: `is_visible+sort_order`, `member_group` · gallery: `is_visible+sort_order`, `category_id` · faqs/stats/features/facilities/quick_links: `is_visible+sort_order` · submissions: `status`, `created_at DESC` · audit: `created_at DESC`, `(entity_type, entity_id)`.

## 5. Constraintlar
NOT NULL, UNIQUE (news slug + format CHECK, kategoriya nomlari), CHECK (member_group enum, gallery type, submission status enum, value ≥ 0), FK (article→news_category SET NULL, gallery_item→gallery_category SET NULL), singleton CHECK (id=1), `updated_at` trigger.

## 6. Migratsiyalar
`supabase/migrations/`: `0001_initial_schema.sql` (jadval+indeks+trigger), `0002_rls.sql` (barcha jadvallarda RLS, default-deny — hech qanday anon policy YO‘Q), `0003_storage.sql` (`media` public bucket). Reproduitsiyalanuvchi — dashboard’da qo‘lda ish talab etilmaydi. **Cheklov:** sandbox’da lokal Postgres yo‘q (apt repo buzgan) → SQL Supabase’da birinchi qo‘llashda tekshiriladi; standart PG DDL.

## 7. Seed/import natijasi
`npm run db:seed` (tsx) — `src/data` → Supabase: idempotent (skip-existing), `--dry-run`, `--force` (ogohlantirilgan overwrite), hisobot (yozildi/o‘tkazildi/xato), PROTOTIP belgisi saqlanadi. Sandbox’da kalit yo‘qligi uchun **dry-run tekshirildi** (to‘g‘ri fail-fast), real yozish kalit kelganda.

## 8. Repository implementatsiyalari
Har bir interfeys uchun 2 ta implementatsiya: **Json** (xotira store, `src/data` dan seed) va **Supabase** (PostgREST, service-role). `repos()` fabrikasi `DATA_PROVIDER` bo‘yicha. Servislar/kontrollerlar o‘zgarmagan — faqat interfeys. Public DTO’lar mappers’da — Phase 2 javoblari bilan mos.

## 9. API o‘zgarishlari
Public `/api/v1/*`: **hech narsa o‘zgarmagan** (18 route, 33/33 eski test o‘tadi). Yangi: `/api/v1/admin/*` (14 guruh): dashboard, news (CRUD+publish+archive/hard), 7 kolleksiya (CRUD+reorder), settings, contact-info, contact-submissions, audit-log, media. Yangi xato kodlari: `CONFLICT` (409), `UNAUTHORIZED` (401). OpenAPI admin bo‘limi qo‘shildi.

## 10. Cache integratsiyasi
Cache-aside saqlangan. Har bir mutatsiya FAQAT o‘z nomlar bo‘yicha invalidatsiya qiladi (news→`v1:news*`, team→`v1:team*`, gallery→`v1:gallery*`, faqs/facilities/features/statistics/quick-links/settings/contact-info→mos kalit). Butun kesh hech qachon to‘liq to‘kanilmaydi.

## 11. Admin route’lar
`/admin` (dashboard) · `/admin/news` (+`/new`, `/[id]/edit`) · `/admin/{team,gallery,faqs,facilities,features,statistics,quick-links}` · `/admin/settings` · `/admin/contact-info` · `/admin/contact` (inbox) · `/admin/audit` · `/admin/media`. Sidebar: Dashboard / Kontent / Sayt / Inbox / Tizim. `noindex`.

## 12. CRUD imkoniyatlari
Qidiruv, filtrlar (status/kategoriya/ko‘rinish), yaratish/tahrirlash, inline visibility toggle, ▲▼ reorder, xavfsiz o‘chirish (yangilik: default arxiv — soft delete; hard delete faqat alohida tasdiq bilan), news editor: auto-slug, qo‘lda tahrir, 409 band slug, blok muharriri (p/h/quote), muqova preview, publish toggle + sana. Client + server zod validatsiya (server vakolatli).

## 13. Media/storage holati
**Poydevor:** `media` bucket (0003), `media_assets` metadata jadvali, `/admin/media` metadata sahifasi; bazada faqat URL/metadata (binar yo‘q). Yuklash pipeline — Phase 4/5 (halol cheklov). Mavjud static media ko‘chirilmadi.

## 14. Audit jurnali
Har mutatsiya: CREATE/UPDATE/DELETE/ARCHIVE/PUBLISH/UNPUBLISH/STATUS_CHANGE/REORDER + entity + metadata + vaqt. `admin_identifier` — faqat haqiqiy mexanizm: `"dev-token"` yoki `null`. **Soxta identifikator yo‘q.**

## 15. Autentifikatsiya cheklovi (halol)
Phase 3’da real auth YO‘Q. Dev gate: `ADMIN_DEV_TOKEN` bo‘lsa `x-admin-dev-token` (timing-safe) talab qilinadi; production’da tokensiz admin API 503. `/admin` banner: «DEVELOPMENT ONLY». Phase 4 real auth/sessiya/rol/MFA keltiradi.

## 16. Testlar
**54/54** (`node --test tests/api.test.mjs tests/admin.test.mjs`): 33 public (regression) + 21 admin: gate 401/503, dashboard hisoblari, draft→public ajratish, duplicate slug 409, 422 field-details, publish→public+audit, arxiv→404 public, hard delete, team reorder+hide, faqs/gallery/statistics public aksi, settings/contact-info + cache, murojaat new→inbox, honeypot→spam (javob jim 200), status+delete, public’da submissions/audit 404, media note.

## 17. Tezlik taqqoslash (sandbox, json provider)
| Ko‘rsatkich | Phase 2 | Phase 3 |
|---|---|---|
| c=10 p50 | ~10 ms | 10–13 ms |
| Xatolar | 0% (24 run) | 0% (24 run) |
| Plateau | ~830–950 rps | ~900–1030 rps |

Regressiya yo‘q. Supabase rejimi kalit kelganda o‘lchanadi. *Lokal sandbox o‘lchovi — production da’vo emas.*

## 18. Frontend regressiya
`/`, `/about`, `/education`, `/team`, `/news`, `/gallery`, `/contact`, yangilik sahifasi, 404 — hammasi 200 ✓. Hero video (campus.mp4) ✓ · storytelling (hero-stage, story-rail, boblar) ✓ · dark/light CSS ✓ · xarita iframe (OSM) ✓ · FAQ ✓ · forma ✓ · dizayn o‘zgarmagan ✓.

## 19. Git holati
5 ta toza commit, force push yo‘q, tarix `86d5037` dan to‘g‘ri davom etadi. Working tree toza. `.env.local` (token bilan) commit qilinmagan (`.env*` ignore).

## 20. Ma’lum cheklovlar
1. Supabase’ga real ulanish + migratsiya + seed — kalitlar kutilmoqda (2–7 bandlar shunga bog‘liq).
2. Admin gate — development-only; production auth Phase 4.
3. Media yuklash UI — Phase 4/5.
4. Sandbox’da lokal Postgres yo‘q → SQL birinchi Supabase qo‘llashda tekshiriladi.
5. json provider admin o‘zgarishlari restartda yo‘qoladi (dizayn bo‘yicha, hujjatlangan).
6. Supabase rejimida public sahifalar API orqali dinamik o‘qiydi (kesh bilan) — javob shakli o‘zgarmaydi.

## 21. Phase 4 aniq shartlari (tayyorlik)
1. Admin autentifikatsiyasi (login, sessiya, parol siyosati, rollar, MFA) → `admin_audit_logs.admin_identifier` real ID bilan to‘ldiriladi.
2. `/admin` middleware himoyasi; token prompt olib tashlanadi.
3. Admin roli uchun RLS policy’lar + Storage yuklash policy’lari.
4. Media yuklash pipeline (upload → metadata).
5. i18n (uz/ru) va Redis/BullMQ adapterlari — Phase 2/3 interfeyslari tayyor.

**STOP — Phase 3 tugadi. Phase 4 foydalanuvchining ochiq ko‘rsatmasisiz boshlanmaydi.**
