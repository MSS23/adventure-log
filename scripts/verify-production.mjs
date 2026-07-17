const baseUrl = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'https://adventure-log-azure.vercel.app')
  .replace(/\/$/, '')

const checks = [
  { name: 'homepage', path: '/', expect: [200] },
  { name: 'health', path: '/api/health', expect: [200] },
  { name: 'manifest', path: '/manifest.json', expect: [200] },
  { name: 'robots', path: '/robots.txt', expect: [200] },
]

let failed = false
for (const check of checks) {
  const started = Date.now()
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Adventure LogProductionVerifier/1.0' },
    })
    const elapsed = Date.now() - started
    const passed = check.expect.includes(response.status)
    console.log(`${passed ? 'PASS' : 'FAIL'} ${check.name} ${response.status} ${elapsed}ms`)
    if (!passed) failed = true

    if (check.name === 'health' && response.ok) {
      const body = await response.json().catch(() => null)
      if (!body || !['healthy', 'degraded'].includes(body.status)) {
        console.error('FAIL health payload did not report a usable status')
        failed = true
      }
    }
  } catch (error) {
    console.error(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`)
    failed = true
  }
}

if (failed) process.exit(1)
console.log(`Adventure Log production smoke checks passed for ${baseUrl}`)
