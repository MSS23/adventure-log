#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const target = process.argv.find((arg) => arg.startsWith('--target='))?.split('=')[1] || 'development'
const strictFeatures = process.argv.includes('--strict-features')
const envPath = resolve(process.cwd(), '.env.local')

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const index = line.indexOf('=')
        return index === -1
          ? [line, '']
          : [line.slice(0, index).trim(), line.slice(index + 1).trim()]
      }),
  )
}

const env = { ...parseEnvFile(envPath), ...process.env }
const isPlaceholder = (value = '') => /^(your|replace|todo)/i.test(value)
const httpsUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)
  } catch {
    return false
  }
}

const rules = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    validate: (value) => /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(value),
    hint: 'Use https://<project-ref>.supabase.co',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    validate: (value) => value.length > 30 && !isPlaceholder(value),
    hint: 'Use the Supabase publishable/anon key',
  },
]

const addHttpsRule = (key) => rules.push({ key, validate: httpsUrl, hint: 'Use a non-local HTTPS URL' })
const addSecretRule = (key) => rules.push({
  key,
  validate: (value) => value.length >= 20 && !isPlaceholder(value),
  hint: 'Configure a non-placeholder secret in the target environment',
})

if (target === 'mobile') addHttpsRule('NEXT_PUBLIC_API_BASE_URL')

if (target === 'production' || target === 'staging') {
  addHttpsRule('NEXT_PUBLIC_APP_URL')
  addHttpsRule('NEXT_PUBLIC_SITE_URL')
  addSecretRule('SUPABASE_SERVICE_ROLE_KEY')
  addHttpsRule('UPSTASH_REDIS_REST_URL')
  addSecretRule('UPSTASH_REDIS_REST_TOKEN')
  addSecretRule('CRON_SECRET')
  addSecretRule('SENTRY_DSN')
  addSecretRule('NEXT_PUBLIC_SENTRY_DSN')
}

let problems = 0
console.log(`\nChecking ${target} environment${existsSync(envPath) ? ' (.env.local + process)' : ' (process only)'}:\n`)
for (const rule of rules) {
  const value = env[rule.key] || ''
  if (!value || !rule.validate(value)) {
    console.error(`  FAIL ${rule.key}: ${rule.hint}`)
    problems++
  } else {
    console.log(`  PASS ${rule.key}`)
  }
}

const featureGroups = [
  { label: 'Mapbox geocoding', keys: ['NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN'] },
  { label: 'Anthropic wishlist extraction', keys: ['ANTHROPIC_API_KEY'] },
  { label: 'Transactional email', keys: ['RESEND_API_KEY', 'EMAIL_FROM'] },
  { label: 'Server image moderation', keys: ['MODERATION_PROVIDER', 'MODERATION_API_KEY'] },
]

if (target === 'production' || target === 'staging') {
  console.log('\nFeature readiness:')
  for (const group of featureGroups) {
    const missing = group.keys.filter((key) => !env[key] || isPlaceholder(env[key]))
    if (missing.length === 0) {
      console.log(`  PASS ${group.label}`)
    } else {
      console.log(`  WARN ${group.label} disabled (${missing.join(', ')})`)
      if (strictFeatures) problems++
    }
  }
}

if (problems > 0) {
  console.error(`\nEnvironment check failed with ${problems} problem(s).\n`)
  process.exit(1)
}
console.log('\nEnvironment check passed.\n')
