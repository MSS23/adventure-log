const baseUrl = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'https://adventure-log-azure.vercel.app')
  .replace(/\/$/, '')

const checks = [
  { name: 'homepage', path: '/', expect: [200] },
  { name: 'health', path: '/api/health', expect: [200] },
  { name: 'manifest', path: '/manifest.json', expect: [200] },
  { name: 'desktop screenshot', path: '/screenshots/desktop-home.png', expect: [200], png: true },
  { name: 'mobile screenshot', path: '/screenshots/mobile-home.png', expect: [200], png: true },
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

    if (check.png && response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer())
      const png = [137, 80, 78, 71, 13, 10, 26, 10]
      if (!png.every((value, index) => bytes[index] === value)) {
        console.error(`FAIL ${check.name} is not a real PNG payload`)
        failed = true
      }
      continue
    }

    if (check.name === 'homepage' && response.ok && baseUrl.startsWith('https://')) {
      for (const header of [
        'content-security-policy',
        'strict-transport-security',
        'x-content-type-options',
        'x-frame-options',
      ]) {
        if (!response.headers.get(header)) {
          console.error(`FAIL homepage missing security header: ${header}`)
          failed = true
        }
      }
    }

    if (check.name === 'manifest' && response.ok) {
      const manifest = await response.json().catch(() => null)
      if (manifest?.name !== 'Adventure Log - Social Travel Memories' || manifest?.share_target?.method !== 'GET') {
        console.error('FAIL manifest payload is stale or invalid')
        failed = true
      }
    }

    if (check.name === 'health' && response.ok) {
      const body = await response.json().catch(() => null)
      if (!body || !['healthy', 'degraded'].includes(body.status)) {
        console.error('FAIL health payload did not report a usable status')
        failed = true
      }
      if (body?.checks?.schemaCurrent === false) {
        console.error('FAIL production database schema is behind the application release')
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
