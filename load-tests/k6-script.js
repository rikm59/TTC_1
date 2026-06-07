/**
 * TTC Estimator — k6 Load Test
 *
 * Tests the 4 most critical paths under escalating load:
 *   1. Landing page (unauthenticated)
 *   2. Supabase REST API — clients list (authenticated)
 *   3. Supabase REST API — estimates list
 *   4. Supabase REST API — profiles read
 *
 * Run against STAGING only. Never against production with real users.
 *
 * Usage:
 *   k6 run load-tests/k6-script.js \
 *     -e BASE_URL=https://your-staging.vercel.app \
 *     -e SUPABASE_URL=https://xxxxx.supabase.co \
 *     -e SUPABASE_ANON_KEY=your_anon_key \
 *     -e TEST_USER_JWT=your_test_user_jwt
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate } from 'k6/metrics'

// ── Custom metrics ───────────────────────────────────────
const pageLoadTime   = new Trend('page_load_ms',     true)
const apiLatency     = new Trend('api_latency_ms',   true)
const errorRate      = new Rate('error_rate')

// ── Load stages: ramp up to 1000 users ───────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10   },  // warm up
    { duration: '1m',  target: 100  },  // normal load
    { duration: '1m',  target: 500  },  // stress
    { duration: '2m',  target: 1000 },  // peak — find the cliff
    { duration: '30s', target: 0    },  // cool down
  ],
  thresholds: {
    // 95% of requests must complete under 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate must stay below 1%
    error_rate: ['rate<0.01'],
    // API calls under 300ms at p95
    api_latency_ms: ['p(95)<300'],
  },
}

const BASE_URL      = __ENV.BASE_URL      || 'http://localhost:4173'
const SUPABASE_URL  = __ENV.SUPABASE_URL  || ''
const ANON_KEY      = __ENV.SUPABASE_ANON_KEY || ''
const USER_JWT      = __ENV.TEST_USER_JWT || ''

// ── Test scenario ─────────────────────────────────────────
export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': USER_JWT ? `Bearer ${USER_JWT}` : `Bearer ${ANON_KEY}`,
  }

  // 1. Landing page load
  const landing = http.get(`${BASE_URL}/`, { tags: { name: 'landing' } })
  pageLoadTime.add(landing.timings.duration)
  check(landing, {
    'landing: status 200': r => r.status === 200,
    'landing: under 2s':   r => r.timings.duration < 2000,
  }) || errorRate.add(1)

  sleep(1)

  if (!SUPABASE_URL || !ANON_KEY) return

  // 2. Clients list — the critical query (must have user_id filter)
  const clientsStart = Date.now()
  const clients = http.get(
    `${SUPABASE_URL}/rest/v1/clients?select=id,name,status,total_value,updated_at&order=updated_at.desc`,
    { headers, tags: { name: 'clients_list' } }
  )
  apiLatency.add(Date.now() - clientsStart)
  check(clients, {
    'clients: status 200':  r => r.status === 200,
    'clients: under 300ms': r => r.timings.duration < 300,
  }) || errorRate.add(1)

  sleep(0.5)

  // 3. Estimates list
  const estimatesStart = Date.now()
  const estimates = http.get(
    `${SUPABASE_URL}/rest/v1/estimates?select=id,estimate_number,project_type,total_quote,status,created_at&order=created_at.desc&limit=20`,
    { headers, tags: { name: 'estimates_list' } }
  )
  apiLatency.add(Date.now() - estimatesStart)
  check(estimates, {
    'estimates: status 200':  r => r.status === 200,
    'estimates: under 300ms': r => r.timings.duration < 300,
  }) || errorRate.add(1)

  sleep(0.5)

  // 4. Profile read
  const profileStart = Date.now()
  const profile = http.get(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,plan,subscription_status,trial_expires_at&limit=1`,
    { headers, tags: { name: 'profile_read' } }
  )
  apiLatency.add(Date.now() - profileStart)
  check(profile, {
    'profile: status 200':  r => r.status === 200,
    'profile: under 200ms': r => r.timings.duration < 200,
  }) || errorRate.add(1)

  sleep(1)
}

// ── Summary ───────────────────────────────────────────────
export function handleSummary(data) {
  const passed  = data.metrics.error_rate?.values?.rate < 0.01
  const p95     = data.metrics.http_req_duration?.values?.['p(95)']
  const cliff   = Object.entries(data.metrics)
    .filter(([k]) => k.includes('latency'))
    .map(([k, v]) => `${k}: p95=${v.values?.['p(95)']?.toFixed(0)}ms`)

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  TTC Load Test Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Status:       ${passed ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`  p95 latency:  ${p95?.toFixed(0)}ms  (threshold: <500ms)`)
  console.log(`  Error rate:   ${(data.metrics.error_rate?.values?.rate * 100)?.toFixed(2)}%`)
  console.log(`  Peak VUs:     ${data.metrics.vus_max?.values?.max}`)
  cliff.forEach(l => console.log(`  ${l}`))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  return {
    'load-tests/results.json': JSON.stringify(data, null, 2),
    stdout: '',
  }
}
