/**
 * KwikQ Load Test Script
 * ─────────────────────────────────────────────────────────
 * Measures API response times and throughput for key endpoints.
 *
 * PREREQUISITES:
 *   1. Backend running locally:  cd Backend && npm run dev
 *   2. Valid Supabase credentials in Backend/.env
 *   3. At least one doctor in the database
 *
 * USAGE:
 *   node load-test.js                          # test public endpoints only
 *   node load-test.js --token YOUR_JWT_TOKEN   # test all endpoints (auth required)
 *
 * HOW TO GET YOUR TOKEN:
 *   Log in via the frontend, then open DevTools → Application → Local Storage
 *   → copy the value of "access_token"
 *
 * OUTPUT:
 *   Prints per-endpoint stats: min, max, avg, median, p95, p99 response times,
 *   plus requests/sec throughput. Use these numbers in your resume bullets.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const CONCURRENCY = 10;       // simultaneous requests per batch
const REQUESTS_PER_TEST = 50; // total requests per endpoint test

// ── Parse CLI args ──────────────────────────────────────
const args = process.argv.slice(2);
let AUTH_TOKEN = null;
const tokenIdx = args.indexOf('--token');
if (tokenIdx !== -1 && args[tokenIdx + 1]) {
  AUTH_TOKEN = args[tokenIdx + 1];
}

// ── Helpers ─────────────────────────────────────────────
function headers(withAuth = false) {
  const h = { 'Content-Type': 'application/json' };
  if (withAuth && AUTH_TOKEN) h['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  return h;
}

async function timedFetch(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const elapsed = performance.now() - start;
    const body = await res.text();
    return { elapsed, status: res.status, ok: res.ok, body };
  } catch (err) {
    const elapsed = performance.now() - start;
    return { elapsed, status: 0, ok: false, error: err.message };
  }
}

async function runBatch(fn, total, concurrency) {
  const results = [];
  for (let i = 0; i < total; i += concurrency) {
    const batchSize = Math.min(concurrency, total - i);
    const batch = await Promise.all(
      Array.from({ length: batchSize }, () => fn())
    );
    results.push(...batch);
  }
  return results;
}

function calcStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const len = sorted.length;
  return {
    count: len,
    min: sorted[0].toFixed(2),
    max: sorted[len - 1].toFixed(2),
    avg: (sum / len).toFixed(2),
    median: sorted[Math.floor(len / 2)].toFixed(2),
    p95: sorted[Math.floor(len * 0.95)].toFixed(2),
    p99: sorted[Math.floor(len * 0.99)].toFixed(2),
  };
}

function printResults(name, results, wallTimeMs) {
  const times = results.map(r => r.elapsed);
  const successes = results.filter(r => r.ok).length;
  const failures = results.length - successes;
  const stats = calcStats(times);
  const rps = (results.length / (wallTimeMs / 1000)).toFixed(1);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Requests:    ${stats.count} (${successes} ok, ${failures} failed)`);
  console.log(`  Throughput:  ${rps} req/sec`);
  console.log(`  ──────────────────────────────────`);
  console.log(`  Min:         ${stats.min} ms`);
  console.log(`  Max:         ${stats.max} ms`);
  console.log(`  Avg:         ${stats.avg} ms`);
  console.log(`  Median:      ${stats.median} ms`);
  console.log(`  p95:         ${stats.p95} ms`);
  console.log(`  p99:         ${stats.p99} ms`);

  return { name, rps, ...stats, successes, failures };
}

// ── Test definitions ────────────────────────────────────
const tests = [
  {
    name: 'GET /doctors (public, no auth)',
    needsAuth: false,
    fn: () => timedFetch(`${BASE_URL}/doctors`, { headers: headers(false) }),
  },
  {
    name: 'GET /doctors (authenticated)',
    needsAuth: true,
    fn: () => timedFetch(`${BASE_URL}/doctors`, { headers: headers(true) }),
  },
  {
    name: 'GET /queue/patient-status (authenticated)',
    needsAuth: true,
    fn: () => timedFetch(`${BASE_URL}/queue/patient-status`, { headers: headers(true) }),
  },
  {
    name: 'GET /queue/history (authenticated)',
    needsAuth: true,
    fn: () => timedFetch(`${BASE_URL}/queue/history`, { headers: headers(true) }),
  },
];

// ── Main ────────────────────────────────────────────────
async function main() {
  console.log(`\n╔${'═'.repeat(58)}╗`);
  console.log(`║   KwikQ Load Test                                        ║`);
  console.log(`╠${'═'.repeat(58)}╣`);
  console.log(`║  Base URL:     ${BASE_URL.padEnd(42)}║`);
  console.log(`║  Concurrency:  ${String(CONCURRENCY).padEnd(42)}║`);
  console.log(`║  Requests:     ${String(REQUESTS_PER_TEST).padEnd(42)}║`);
  console.log(`║  Auth token:   ${AUTH_TOKEN ? 'provided' : 'not provided (skipping auth tests)'}${AUTH_TOKEN ? '                                  ' : '  '}║`);
  console.log(`╚${'═'.repeat(58)}╝`);

  // Quick connectivity check
  console.log('\nChecking server connectivity...');
  const ping = await timedFetch(`${BASE_URL}/doctors`);
  if (!ping.ok) {
    console.error(`\n✕ Cannot reach ${BASE_URL}/doctors (status: ${ping.status})`);
    console.error('  Make sure the backend is running: cd Backend && npm run dev');
    process.exit(1);
  }
  console.log(`✓ Server reachable (${ping.elapsed.toFixed(0)}ms)\n`);

  const summary = [];

  for (const test of tests) {
    if (test.needsAuth && !AUTH_TOKEN) {
      console.log(`\n⊘ Skipping "${test.name}" (no --token provided)`);
      continue;
    }

    process.stdout.write(`Running "${test.name}" (${REQUESTS_PER_TEST} requests, ${CONCURRENCY} concurrent)...`);

    const wallStart = performance.now();
    const results = await runBatch(test.fn, REQUESTS_PER_TEST, CONCURRENCY);
    const wallTime = performance.now() - wallStart;

    const stats = printResults(test.name, results, wallTime);
    summary.push(stats);
  }

  // ── Summary table ───────────────────────────────────
  console.log(`\n\n${'━'.repeat(60)}`);
  console.log('  SUMMARY');
  console.log(`${'━'.repeat(60)}`);
  console.log(
    '  Endpoint'.padEnd(42) +
    'Avg(ms)'.padStart(9) +
    'p95(ms)'.padStart(9) +
    'RPS'.padStart(8)
  );
  console.log(`  ${'─'.repeat(56)}`);
  for (const s of summary) {
    const shortName = s.name.replace(/\(.*\)/, '').trim();
    console.log(
      `  ${shortName.padEnd(40)}${s.avg.padStart(9)}${s.p95.padStart(9)}${s.rps.padStart(8)}`
    );
  }
  console.log(`${'━'.repeat(60)}`);

  console.log('\n📋 Use these numbers in your resume bullets! For example:');
  if (summary.length > 0) {
    const fastest = summary.reduce((a, b) => parseFloat(a.avg) < parseFloat(b.avg) ? a : b);
    console.log(`   "Serves ${fastest.name.match(/\/\w[\w/-]*/)?.[0] || 'API requests'} in ${fastest.avg}ms avg (p95: ${fastest.p95}ms) at ${fastest.rps} req/sec"\n`);
  }
}

main().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
