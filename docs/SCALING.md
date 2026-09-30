# Scaling Architecture — 202-maktab

## Hozirgi holat (Phase 2, o'lchangan)

Bitta Next.js instance (statik frontend + API bir jarayonda) Arena sandbox'ida:

- **~830–950 req/s** (API, 0% xato, barcha concurrency 10→1000) — batafsil: `docs/LOAD-TEST.md`
- Statik HTML sahifalar CDN'ga berilsa, API'ga umuman tegmaydigan trafik

⚠️ **Bu lokal sandbox raqamlari.** Production sig'imi infrastruktura va benchmark'siz
da'vo qilinmaydi. "1 million concurrent users" degan da'vo YO'Q va bo'lmaydi —
quyida faqat **ushbu trafikka yetib borish yo'li** keltirilgan.

## Arxitektura tamoyillari (allaqachon bajarilgan)

1. **Stateless API** — hech qanday sessiya/sticky-session talab yo'q
2. **Statik prerender** — 14 HTML hujjat; API o'lsa ham sahifalar ishlaydi
3. **Memory cache = optimizatsiya, manba emas** — manba: data modullari (Phase 3: DB)
4. **CDN-friendly**: `Cache-Control` (immutable assetlar, s-maxage + SWR API javoblari), `ETag`/304
5. **Queue abstraksiyasi** — vazifalar processdan tashqariga ko'chishi tayyor

## Sig'imni oshirish yo'li (bosqichma-bosqich)

```
               ┌─────────────┐
   Users ──▶   │  CDN / Edge │  (HTML, /images/*, /video/* — ~95% trafik shu yer tugaydi)
               └──────┬──────┘
                      │ cache miss / dynamic
               ┌──────▼──────┐
               │ Load Balancer│  (WAF + DDoS himoya)
               └──┬────┬────┬─┘
             ┌────▼┐ ┌─▼──┐ ┌▼───┐
             │ API │ │ API│ │ API│   N × Next.js/Fastify replica (stateless)
             └──┬──┘ └──┬─┘ └──┬─┘
              ┌─▼───────▼──────▼─┐
              │  Redis (shared)  │  cache + rate-limit + queue (BullMQ)
              └────────┬─────────┘
              ┌────────▼─────────┐
              │ Postgres primary │ + read replica'lar (Phase 3)
              └────────┬─────────┘
              ┌────────▼─────────┐
              │ Object storage   │  (media: S3/kvot, CDN origin)
              └──────────────────┘
```

| Qadam | Nima qo'shiladi | Taxminiy ta'sir |
|---|---|---|
| 1 | CDN (Cloudflare/CloudFront) statik uchun | O'nlab ×: API'ga tegmaydigan statik trafik |
| 2 | API replikalari (2–4) + LB | Chiziqli API o'sish (stateless ✓) |
| 3 | Redis: shared cache + distributed rate-limit | Replikalar orasida izchil limit/kesh |
| 4 | Postgres + connection pooling (pgBouncer) + read replica | DB yukini ajratish |
| 5 | Media → object storage + CDN origin | API/disk yukini nolga tushirish |
| 6 | Queue worker'lar (email, media) alohida mashinalarda | Request-path'dan og'ir ishlarni olib tashlash |
| 7 | Health-check asosida autoscaling | Trafikqa mos replika soni |

## Million foydalanuvchi haqida halol gap

- **1M concurrent** = o'n millionlab req/soat piklarda. Bu **taqsimlangan infrastruktura,
  haqiqiy yuk testi va production sozlamalari**ni talab qiladi
- Ushbu sayt uchun realistik hisob-kitob: maktab auditoriyasi (oquvchi+ota-ona ~bir necha
  o'n ming foydalanuvchi) — **katta kunlarda ham** (masalan, 1-sentabr) CDN + 2–3 API replika
  + Redis osongina yetadi
- Agar pik trafik kerak bo'lsa: yuqoridagi 1–5 qadamlar + haqiqiy yuk testi (k6 bulutda)
  → keyingina sig'im raqami aytiladi

## Deployment (Phase 2'da tayyorlangan)

- `npm run build && npm start` — production start
- `.env.example` — barcha sozlamalar; `getEnv()` startup'da validatsiya qiladi
- `/api/v1/health/live` + `/api/v1/health/ready` — LB health-check'lari
- Statik (HTML/media) va API bir jarayonda, lekin **ajratish tayyor**: API route'lari
  `src/server/*` modular monolitda — Fastify'ga ko'chirish controllers/services'ga tegmaydi
- Reverse-proxy/CDN mos: xavfsizlik sarlavhalari + to'g'ri Cache-Control + ETag
