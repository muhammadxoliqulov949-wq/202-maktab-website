# 202-maktab — rasmiy sayt

**Holat:** Phase 3 (Database + Admin CMS) ✅ · Phase 2 (API backend) ✅ · Phase 1 (Frontend) ✅

Phase 3 qisqacha: Supabase PostgreSQL (15 jadval, migratsiyalar), json|supabase provider switch, /admin CMS (yangiliklar, jamoa, galereya, FAQ, inshootlar, statistika, sozlamalar, murojaatlar inbox, audit), admin API (/api/v1/admin/*), audit jurnali, seed skript. Batafsil: **docs/DATABASE.md** va **PHASE-3-HISOBOT.md**.

> ⚠️ /admin — DEVELOPMENT ONLY (Phase 3). Real autentifikatsiya Phase 4'da. Barcha kontent hozircha PROTOTIP.

**202-sonli umumiy o‘rta ta’lim maktabi** — Chilonzor tumani, Toshkent shahri.

Premium **neumorphic** dizayn tizimiga ega zamonaviy maktab sayti. Ushbu bosqichda
**faqat frontend** tajribasi qurilgan: vizual identifikatsiya, UI tizimi, UX,
responsive layouts, sahifa tuzilmasi, qayta ishlatiladigan komponentlar, animatsiyalar
va mikro-interaksiyalar. Backend, ma’lumotlar bazasi, autentifikatsiya va admin panel
keyingi bosqichlarda qo‘shiladi.

## Texnologiyalar

- **Next.js 15** (App Router, TypeScript, statik prerender)
- **Tailwind CSS v4** + maxsus neumorphic design-token tizimi (`globals.css`)
- **@fontsource-variable** — Manrope + Space Grotesk (o‘z-o‘zida xost qilingan shriftlar)
- **Zero animation dependencies** — barcha harakatlar CSS + IntersectionObserver + rAF asosida

## Ishga tushirish

```bash
npm install
npm run dev    # http://localhost:3000
npm run build && npm start   # production
```

## Sahifalar

| Marshrut | Sahifa |
|---|---|
| `/` | Bosh sahifa — 11 bo‘limli vizual hikoya |
| `/about` | Maktab haqida — hikoya, missiya, qadriyatlar, statistika, inshootlar, timeline |
| `/education` | Ta’lim — bosqichlar, fanlar, metodika, to‘garaklar, inklyuziv ta’lim |
| `/team` | Jamoa — qidiruv + kategoriya filtri + «yana ko‘rsatish» |
| `/news` | Yangiliklar — featured + filtrlar + load-more |
| `/news/[slug]` | Maqola sahifasi — ulashish, o‘xshash maqolalar |
| `/gallery` | Galereya — toifalar, albomlar, lightbox (klaviatura + swipe) |
| `/contact` | Aloqa — forma UI, xarita, FAQ |
| `404` | Maxsus «Bu sahifa sinfda emas» sahifasi |

## Arxitektura

```
src/
  app/            # sahifa routlari (App Router)
  components/
    layout/       # Navbar (sticky + mobil sheet + til + tema), Footer
    sections/     # sahifa bo‘limlari (Hero, Stats, LifeMosaic, ...)
    forms/        # ContactForm (UI validatsiyasi bilan)
    media/        # SmartVideo (lazy video + poster fallback)
    motion/       # Reveal, RevealLines, Stagger
    ui/           # Icon (inline ikonalar to‘plami)
  data/           # BARCHA kontent shu yerda — Phase 3/5 da DB bilan almashtiriladi
  lib/            # motion primitivlari (useInView, useCountUp, useParallax)
public/
  images/         # vaqtinchalik prototip rasmlar (AI-generatsiya, maktab emas!)
  video/          # prototip video (Ken Burns — rasm asosida)
```

## Muhim eslatmalar

- **Barcha kontent prototip:** ismlar, yangiliklar, statistika va manzil — namunaviy.
  Tekshirilgan rasmiy ma’lumotlar Phase-5 da kiritiladi.
- **Rasmlar AI-generatsiya** va faqat vaqtinchalik; real maktab fotoları Admin Paneldan
  yuklanadi (komponentlar `photo: ""` bo‘lsa avtomatik initsial-avatar ko‘rsatadi).
- **Til tanlagichi:** UZ faol; RU versiya «tez orada» holatda (halol prototip).
- **Mavzu (rejim):** yorug‘/tungi — OS sozlamasiga mos + qo‘lda almashtirish, FOUC-siz.
- **Reduced motion:** `prefers-reduced-motion` bo‘yicha barcha animatsiyalar o‘chiriladi.

## Phase 3 — Database va Admin CMS (qisqacha)

### Supabase ulanish
```bash
cp .env.example .env.local
# DATA_PROVIDER=supabase, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY to'ldiring
npm run db:migrate   # migratsiya fayllari ro'yxati (SQL editor yoki supabase CLI)
npm run db:seed      # src/data prototip kontentini bazaga ko'chirish (idempotent)
```

## Phase 4 — Autentifikatsiya va admin huquqlari (qisqacha)

Batafsil: **[`docs/AUTH.md`](docs/AUTH.md)**.

### Admin panel
`/admin` — Supabase Auth (email + parol) bilan himoyalangan. Anonim → `/admin/login`ga redirect;
autentifikatsiyadan o‘tgan, lekin admin bo‘lmagan foydalanuvchi → HTTP 403.

```bash
# 1) migratsiyalarni qo‘llang (0001–0004)
# 2) birinchi adminni yarating (parol STDIN'dan o‘qiladi, hech qayerda chop etilmaydi)
node scripts/admin-user.mjs create --email siz@202-maktab.uz --role admin
node scripts/admin-user.mjs list
```

Endpointlar: `/api/v1/auth/{login,logout,session}` va
`/api/v1/admin/{dashboard,news,team,gallery,faqs,facilities,features,statistics,settings,contact-info,quick-links,contact-submissions,audit-log,media,admin-users}`.

Har bir admin endpoint mustaqil tekshiradi: sessiya → `admin_users` yozuvi → `is_active` → rol ruxsati → CSRF.

> Phase 3'dagi `ADMIN_DEV_TOKEN` / `x-admin-dev-token` development gate'i **butunlay olib tashlangan**.

### Provider switch
`DATA_PROVIDER=json` (default, dev) yoki `supabase` (production). Farqi faqat `.env`da — kod bir xil.
