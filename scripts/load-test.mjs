/**
 * Phase 2 load testing — autocannon, progressive concurrency.
 *
 * Usage:
 *   1) Start a production server with generous limits on port 3111:
 *        RATE_LIMIT_PUBLIC_READ_MAX=1000000 RATE_LIMIT_SEARCH_MAX=1000000 \
 *        API_DOCS_ENABLED=true METRICS_ENABLED=true npx next start -p 3111
 *   2) node scripts/load-test.mjs
 *
 * Results are printed as a markdown table and saved to /tmp/loadtest-results.md.
 * These are LOCAL SANDBOX numbers — do not extrapolate to production capacity.
 */
import autocannon from "autocannon";
import { writeFileSync } from "node:fs";

const BASE = process.env.LOAD_BASE ?? "http://127.0.0.1:3111";
const DURATION = Number(process.env.LOAD_DURATION ?? 4); // seconds per test
const CONCURRENCIES = [10, 50, 100, 250, 500, 1000];

const ENDPOINTS = [
  { name: "GET /api/v1/health", path: "/api/v1/health" },
  { name: "GET /api/v1/news", path: "/api/v1/news" },
  { name: "GET /api/v1/team", path: "/api/v1/team" },
  { name: "GET /api/v1/gallery", path: "/api/v1/gallery" },
];

function runOne(url, connections) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        connections,
        duration: DURATION,
        pipelining: 1,
        headers: { "x-forwarded-for": "10.99.99.99" }, // stable key, generous limits on target server
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    instance.on("response", () => {});
  });
}

const rows = [];
for (const ep of ENDPOINTS) {
  for (const c of CONCURRENCIES) {
    process.stdout.write(`▶ ${ep.name} @ c=${c} ... `);
    let r;
    try {
      r = await runOne(`${BASE}${ep.path}`, c);
    } catch (err) {
      rows.push({ endpoint: ep.name, c, error: String(err) });
      console.log("FAILED:", err);
      continue;
    }
    const errors = r.errors + (r.timeouts || 0) + (r.non2xx || 0);
    const row = {
      endpoint: ep.name,
      c,
      rps: Math.round(r.requests.average),
      total: r.requests.total,
      p50: r.latency.p50,
      p90: r.latency.p90,
      p99: r.latency.p99,
      errors,
      errPct: ((errors / r.requests.total) * 100).toFixed(2) + "%",
    };
    rows.push(row);
    console.log(`${row.rps} rps | p90=${row.p90}ms p99=${row.p99}ms | err=${row.errPct}`);
    await new Promise((res) => setTimeout(res, 700)); // cool-down between runs
  }
}

// markdown report
let md = `# Load test (local sandbox) — ${new Date().toISOString()}\n\n`;
md += `Target: ${BASE} · duration ${DURATION}s per run · autocannon · pipelining 1\n\n`;
md += "| Endpoint | Concurrency | req/s | total | p50 (ms) | p90 (ms) | p99 (ms) | errors | err % |\n";
md += "|---|---|---|---|---|---|---|---|---|\n";
for (const r of rows) {
  if (r.error) {
    md += `| ${r.endpoint} | ${r.c} | — | — | — | — | — | CRASH | — |\n`;
  } else {
    md += `| ${r.endpoint} | ${r.c} | ${r.rps} | ${r.total} | ${r.p50} | ${r.p90} | ${r.p99} | ${r.errors} | ${r.errPct} |\n`;
  }
}
writeFileSync("/tmp/loadtest-results.md", md);
console.log("\n✅ Results saved to /tmp/loadtest-results.md\n");
console.log(md);
