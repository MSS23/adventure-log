#!/usr/bin/env node
/**
 * Verify required environment variables are present and look valid.
 * Run with:  npm run check:env
 *
 * Exits 0 if all required vars are set, 1 otherwise.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const ENV_LOCAL = resolve(ROOT, '.env.local')

if (!existsSync(ENV_LOCAL)) {
  console.error('\n  ✗ .env.local not found.')
  console.error('    Copy .env.local.example → .env.local and fill in your Supabase values.')
  console.error('    Without it, the app cannot connect to Supabase and most pages will error.\n')
  process.exit(1)
}

// Tiny dotenv-style parser; we don't need full support.
const env = Object.fromEntries(
  readFileSync(ENV_LOCAL, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=')
      if (idx === -1) return [line, '']
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    }),
)

const required = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    validate: (v) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(v),
    hint: 'Should look like https://your-project-id.supabase.co',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    validate: (v) => v.length > 30 && !v.includes('your-'),
    hint: 'Get from Supabase Dashboard → Project Settings → API → anon/public key',
  },
]

const optional = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN',
  'ANTHROPIC_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SENTRY_DSN',
]

let problems = 0

console.log('\n  Checking environment in .env.local…\n')

for (const { key, validate, hint } of required) {
  const value = env[key]
  if (!value) {
    console.error(`    ✗ ${key} is missing.`)
    console.error(`        ${hint}`)
    problems++
  } else if (!validate(value)) {
    console.error(`    ✗ ${key} looks like a placeholder.`)
    console.error(`        ${hint}`)
    problems++
  } else {
    console.log(`    ✓ ${key}`)
  }
}

console.log('\n  Optional integrations:')
for (const key of optional) {
  const value = env[key]
  if (value && !/^(your|REPLACE|TODO)/i.test(value)) {
    console.log(`    ✓ ${key}`)
  } else {
    console.log(`    · ${key} not set (optional)`)
  }
}

if (problems > 0) {
  console.error(`\n  ${problems} required value(s) need attention.`)
  console.error('  Fix .env.local and re-run.\n')
  process.exit(1)
}

console.log('\n  All required environment variables look good.\n')
process.exit(0)
