# API Reference — `/api/v1`

Barcha javoblar yagona kontratga mos:

```json
// Success
{ "success": true, "data": {}, "meta": { "requestId": "...", "cache": "HIT|MISS", "page": 1, "limit": 12, "total": 6, "totalPages": 1 } }

// Failure (hech qachon stack/path/secret yo'q)
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Safe public message" }, "meta": { "requestId": "..." } }
```

Xatolar kodlari: `BAD_REQUEST` (400) · `VALIDATION_ERROR` (422) · `NOT_FOUND` (404) ·
`METHOD_NOT_ALLOWED` (405) · `PAYLOAD_TOO_LARGE` (413) · `UNSUPPORTED_MEDIA_TYPE` (415) ·
`RATE_LIMITED` (429, `Retry-After` sarlavhasi bilan) · `INTERNAL_ERROR` (500).

Har bir javobda: `X-Request-Id`, `ETag` (conditional GET → 304), `Cache-Control` (o'qish uchun).

## Health

| Marshrut | Tavsif |
|---|---|
| `GET /api/v1/health` | Servis holati (status, uptime, version) |
| `GET /api/v1/health/live` | Liveness probe |
| `GET /api/v1/health/ready` | Readiness probe (cache/queue provider nomlari) |

## Statik kontent (CDN-cacheable)

| Marshrut | TTL (s-maxage) | Tavsif |
|---|---|---|
| `GET /api/v1/site-config` | 1800 | Sayt identifikatsiyasi |
| `GET /api/v1/stats` | 1800 | Statistika (prototip qiymatlar) |
| `GET /api/v1/features` | 1800 | Ta'lim imkoniyatlari (01–06) |
| `GET /api/v1/facilities` | 1800 | Inshootlar |
| `GET /api/v1/faqs` | 1800 | FAQ (frontend accordion'i JS'siz ishlashda davom etadi) |
| `GET /api/v1/quick-links` | 1800 | Tezkor havolalar |
| `GET /api/v1/contact-info` | 1800 | Aloqa + xarita (latitude/longitude/embed, `verified:false`) |

## News

```
GET /api/v1/news?category=Tadbirlar&search=spartakiada&page=1&limit=12&sort=date-desc
GET /api/v1/news/:slug
```

- `category`: Yangiliklar | Tadbirlar | Sport | Tanlovlar | Ochiq darslar
- `search`: max 100 belgi, `%_\` belgilari sanitizatsiya qilinadi
- `limit`: 1–50 (default 12) · `sort`: date-desc | date-asc | title
- Javob `meta`: page, limit, total, totalPages
- Noma'lum slug → `404 NOT_FOUND`
- TTL: list 120s, item 900s

## Team

```
GET /api/v1/team?role=teachers&subject=matematika&search=aziza&page=1&limit=12
GET /api/v1/team/:id
```

- `role`: leadership | teachers | administration · `subject`: fan nomi bo'yicha qism-qidiruv
- `limit`: 1–50 (**default 12**) · javob `meta`: page, limit, total, totalPages
  → barcha 16 a'zoni bitta so'rovda olish uchun `GET /api/v1/team?limit=50` (sahifalash filtr emas)
- 16 prototip a'zo (p-01…p-06 portret, p-07+ avatar fallback) TTL: list 600s, item 900s

## Gallery

```
GET /api/v1/gallery?type=video&category=Sport&page=1&limit=12
GET /api/v1/gallery/:id
```

- Faqat **metadata + URL'lar** — media fayllar statik/CDN orqali (`/images/*`, `/video/*`)
- `type`: image | video TTL: list 300s, item 600s

## Contact

```
POST /api/v1/contact
Content-Type: application/json

{ "name": "Aziza Karimova", "contact": "+998 90 123 45 67", "topic": "admission", "message": "..." }
```

- Validatsiya: name 2–80 · contact (email yoki telefon regex) · message 10–2000 · topic enum
- `website` maydoni — honeypot (to'ldirilsa shovqinsiz "spam" deb belgilanadi, javob baribir 200)
- Normalizatsiya: trim, ko'p bo'shliqlarni yig'ish, boshqaruv belgilarini olib tashlash
- Limitlar: body ≤ 8KB · **5 so'rov/60s per IP** (`RATE_LIMIT_CONTACT_*` env orqali)
- Jarayon: validate → normalize → spam-filter → **queue (inline)** → audit-log
  (Phase 2'da saqlanmaydi; Phase 3/4 DB/email handler ulanadi)
- Frontend holatlari: idle / submitting / success / validation-error / rate-limited / server-error — soxta success YO'Q

## Auth (Phase 4)

| Marshrut | Tavsif |
|---|---|
| `POST /api/v1/auth/login` | `{ email, password }` → Supabase Auth tekshiruvi. Muvaffaqiyatda HttpOnly `m202_session` + o'qiladigan `m202_csrf` cookie o'rnatiladi. **Hech qachon token qaytarmaydi.** |
| `POST /api/v1/auth/logout` | Refresh token'ni GoTrue'da bekor qiladi, ikkala cookie'ni tozalaydi, audit'ga `LOGOUT` yozadi |
| `GET /api/v1/auth/session` | `{ authenticated, admin: { email, role, permissions } \| null }` — token'siz xulosa |

Login javoblari:

| Holat | Ma'no |
|---|---|
| 200 | Faol admin — panelga kirish mumkin |
| 401 | Noto'g'ri email/parol (yagona umumiy xabar: *"Login failed. Please check your email and password."*) |
| 403 | Autentifikatsiya muvaffaqiyatli, lekin hisob admin emas yoki o'chirilgan |
| 422 | Validatsiya xatosi (field details bilan) |
| 429 | `RATE_LIMIT_LOGIN_MAX` (default 10/60s) — IP **va** email bo'yicha |

## Admin API (Phase 4 himoyasi)

Har bir `/api/v1/admin/*` marshruti mustaqil ravishda tekshiradi:

1. HttpOnly sessiya cookie → `supabase.auth.getUser()` (GoTrue'da tekshiriladi) → aks holda **401**
2. `x-csrf-token` sarlavhasi `m202_csrf` cookie'siga teng (faqat POST/PUT/PATCH/DELETE) → aks holda **403 `CSRF_FAILED`**
3. `admin_users` yozuvi mavjud → aks holda **403**
4. `is_active = true` → aks holda **403**
5. `admin_roles.permissions` kerakli ruxsatni o'z ichiga oladi → aks holda **403**

| Ruxsat | Marshrutlar |
|---|---|
| `dashboard.read` | `GET /api/v1/admin/dashboard` |
| `content.read` / `content.write` | news, team, gallery, faqs, facilities, features, statistics, quick-links |
| `inbox.read` / `inbox.write` | contact-submissions |
| `audit.read` | audit-log |
| `media.read` / `media.write` | media (+ `POST` multipart upload, `DELETE`) |
| `settings.read` / `settings.write` | settings, contact-info |
| `admin.manage` | admin-users (grant / deactivate / delete) |

Batafsil: [`AUTH.md`](AUTH.md).

## Meta

| Marshrut | Tavsif |
|---|---|
| `GET /api/docs` | OpenAPI 3.0.3 spec (`API_DOCS_ENABLED`, production'da default o'chiq) |
| `GET /api/v1/metrics` | Process-metrics (counters, cache hits/misses, latency p50/p90/p99) — `METRICS_ENABLED` gate |

## Rate limit siyosatlari

| Siyosat | Limit (default) | Qo'llanilishi |
|---|---|---|
| publicRead | 240/60s | statik kontent o'qishlari |
| search | 60/60s | news/team qidiruvlari |
| contact | 5/60s | forma yuborish |
| auth | 10/60s | `POST /api/v1/auth/login` — IP **va** yuborilgan email bo'yicha |
| admin | 120/60s | barcha `/api/v1/admin/*` |

Phase 2 limiter — har instance uchun xotirada. Load balancer ortida umumiy limitlar
Redis limiter orqali ta'minlanadi (interfeys tayyor: `RateLimiter`).
