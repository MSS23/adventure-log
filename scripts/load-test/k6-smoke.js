/**
 * Adventure Log — k6 load / stress test
 * =====================================
 *
 * Verifies the app stays fast as concurrency rises, which is the scaling
 * concern that motivated the caching / queueing / indexing work. It hammers
 * UNAUTHENTICATED, read-only surfaces only (health, manifest, landing,
 * discover) so it never mutates data or needs a session.
 *
 * Install k6:   https://k6.io/docs/get-started/installation/
 *
 * Run against local dev:
 *   BASE_URL=http://localhost:3000 k6 run scripts/load-test/k6-smoke.js
 *
 * Run against production (be considerate — this generates real traffic):
 *   BASE_URL=https://your-deployed-domain k6 run scripts/load-test/k6-smoke.js
 *
 * Override the load profile:
 *   PROFILE=stress  k6 run scripts/load-test/k6-smoke.js   # ramp to 200 VUs
 *   PROFILE=spike   k6 run scripts/load-test/k6-smoke.js   # sudden burst
 *   (default PROFILE=smoke — a gentle ramp to 20 VUs)
 *
 * To exercise AUTHENTICATED endpoints, pass a Supabase access token and add
 * the routes you care about below:
 *   AUTH_TOKEN=eyJ... k6 run scripts/load-test/k6-smoke.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''
const PROFILE = __ENV.PROFILE || 'smoke'

const errorRate = new Rate('errors')
const apiLatency = new Trend('api_latency', true)

const PROFILES = {
  smoke: {
    stages: [
      { duration: '30s', target: 20 },
      { duration: '1m', target: 20 },
      { duration: '20s', target: 0 },
    ],
  },
  stress: {
    stages: [
      { duration: '1m', target: 50 },
      { duration: '2m', target: 200 },
      { duration: '2m', target: 200 },
      { duration: '1m', target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: '10s', target: 5 },
      { duration: '10s', target: 300 }, // sudden burst
      { duration: '1m', target: 300 },
      { duration: '20s', target: 0 },
    ],
  },
}

export const options = {
  stages: (PROFILES[PROFILE] || PROFILES.smoke).stages,
  thresholds: {
    // Fail the run if these scaling guarantees are breached.
    http_req_duration: ['p(95)<800', 'p(99)<2000'],
    errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
}

const authHeaders = AUTH_TOKEN
  ? { Authorization: `Bearer ${AUTH_TOKEN}` }
  : {}

function hit(name, path, { auth = false } = {}) {
  const res = http.get(`${BASE_URL}${path}`, {
    headers: auth ? authHeaders : {},
    tags: { name },
  })
  apiLatency.add(res.timings.duration, { name })
  const ok = check(res, {
    [`${name} status < 400`]: (r) => r.status > 0 && r.status < 400,
  })
  errorRate.add(!ok)
  return res
}

export default function () {
  group('public read endpoints', () => {
    hit('health', '/api/health')
    hit('manifest', '/api/manifest')
    hit('landing', '/')
    hit('discover', '/discover')
  })

  // Authenticated endpoints — only run when a token is supplied. Add the
  // read-only routes you want to stress here (they 401 without a session).
  if (AUTH_TOKEN) {
    group('authenticated read endpoints', () => {
      hit('wishlist', '/api/wishlist', { auth: true })
      hit('trips', '/api/trips', { auth: true })
    })
  }

  sleep(1)
}
