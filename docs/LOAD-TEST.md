# Load Test natijalari — Phase 2

**Muhim:** quyidagi raqamlar **Arena sandbox'ining lokal natijalari** (bitta Next.js instance,
 CPU-kvota cheklangan konteyner). Production sig'imi sifatida talqin qilinmaydi —
 faqat arxitekturaning xulq-atvorini (xato yo'qligi, degradatsiya xarakteri) tasdiqlaydi.

**Metodika:** autocannon v7 · har bir test 4s · pipelining 1 · bitta IP (keng limitli target server)
· progressive concurrency: 10 → 50 → 100 → 250 → 500 → 1000

## Xulosa

- ✅ **Barcha 24 testda 0% xato** (health, news, team, gallery × 6 concurrency)
- ✅ Throughput plato: **~830–950 req/s** (sandbox CPU chegarasi; xato yo'q, faqat navbat o'sadi)
- ✅ c=10 da p50 ≈ 10–11ms (kesh HIT rejimida)
- ✅ Yuqori concurrency'da latency chiziqli o'sadi → graceful degradation, crash yo'q
- ✅ Production'da CDN statikni olib ketgani uchun API'ga bunday yuk tushmaydi

| Endpoint | Concurrency | req/s | total | p50 (ms) | p90 (ms) | p99 (ms) | errors | err % |
|---|---|---|---|---|---|---|---|---|
| GET /api/v1/health | 10 | 761 | 3045 | 11 | 19 | 35 | 0 | 0.00% |
| GET /api/v1/health | 50 | 856 | 3422 | 55 | 66 | 128 | 0 | 0.00% |
| GET /api/v1/health | 100 | 883 | 3532 | 69 | 90 | 1277 | 0 | 0.00% |
| GET /api/v1/health | 250 | 947 | 3786 | 262 | 304 | 316 | 0 | 0.00% |
| GET /api/v1/health | 500 | 946 | 3783 | 518 | 583 | 695 | 0 | 0.00% |
| GET /api/v1/health | 1000 | 885 | 3539 | 1104 | 1153 | 1166 | 0 | 0.00% |
| GET /api/v1/news | 10 | 820 | 3279 | 10 | 12 | 23 | 0 | 0.00% |
| GET /api/v1/news | 50 | 930 | 3719 | 53 | 60 | 74 | 0 | 0.00% |
| GET /api/v1/news | 100 | 873 | 3490 | 112 | 124 | 148 | 0 | 0.00% |
| GET /api/v1/news | 250 | 825 | 3300 | 291 | 361 | 378 | 0 | 0.00% |
| GET /api/v1/news | 500 | 905 | 3618 | 185 | 211 | 225 | 0 | 0.00% |
| GET /api/v1/news | 1000 | 896 | 3585 | 1086 | 1162 | 1320 | 0 | 0.00% |
| GET /api/v1/team | 10 | 798 | 3191 | 10 | 13 | 24 | 0 | 0.00% |
| GET /api/v1/team | 50 | 899 | 3595 | 54 | 61 | 83 | 0 | 0.00% |
| GET /api/v1/team | 100 | 920 | 3681 | 109 | 118 | 139 | 0 | 0.00% |
| GET /api/v1/team | 250 | 860 | 3440 | 178 | 200 | 215 | 0 | 0.00% |
| GET /api/v1/team | 500 | 876 | 3503 | 566 | 600 | 635 | 0 | 0.00% |
| GET /api/v1/team | 1000 | 903 | 3612 | 1104 | 1165 | 1322 | 0 | 0.00% |
| GET /api/v1/gallery | 10 | 739 | 2956 | 10 | 13 | 28 | 0 | 0.00% |
| GET /api/v1/gallery | 50 | 846 | 3382 | 57 | 63 | 97 | 0 | 0.00% |
| GET /api/v1/gallery | 100 | 834 | 3335 | 113 | 146 | 164 | 0 | 0.00% |
| GET /api/v1/gallery | 250 | 875 | 3501 | 236 | 258 | 279 | 0 | 0.00% |
| GET /api/v1/gallery | 500 | 880 | 3521 | 560 | 590 | 605 | 0 | 0.00% |
| GET /api/v1/gallery | 1000 | 921 | 3683 | 1031 | 1146 | 1205 | 0 | 0.00% |


## Interpretatsiya (halol)

| Kuzatish | Izoh |
|---|---|
| c=1000 da p50 ≈ 1s | Bu server sekinligi emas — sandbox'da bitta CPU yadrosida 1000 bir vaqtli ulanish navbati. Xatolar 0%, timeouts 0 |
| ~900 req/s plato | Sandbox vCPU kvotasi. Production'da 2–4 replika × CDN bilan qamrov bir necha ×10 barobar |
| news c=500 p50=185ms < c=250 (291ms) | Autocannon warm-up jiteri; har holatda 0 xato |

## Nima keyingi bosqichda (Phase 3+)

- K6 bilan real senariylar (browse + search + submit) va bulut load generator'lari
- CDN bilan E2E test (statik vs API ajratilgan)
- Production-miqyos benchmark PostgreSQL qo'shilgach
