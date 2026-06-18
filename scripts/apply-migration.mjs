#!/usr/bin/env node
/**
 * General single-migration runner. Applies one or more migration files from
 * supabase/migrations/ to the linked Supabase project.
 *
 * Strategy (same as scripts/apply-trip-migrations.mjs):
 *   1. SUPABASE_ACCESS_TOKEN → Supabase Management API (cleanest path).
 *   2. SUPABASE_DB_URL       → direct node-postgres connection (needs `pg`).
 *   3. neither               → print SQL + the SQL-editor URL to paste by hand.
 *
 * Idempotent: "already exists"/"duplicate" errors count as skips, so re-running
 * after a partial apply is safe.
 *
 * Usage:
 *   node -r dotenv/config scripts/apply-migration.mjs 43_place_recommendations.sql dotenv_config_path=.env.local
 *   node -r dotenv/config scripts/apply-migration.mjs --print 43_place_recommendations.sql dotenv_config_path=.env.local
 *
 * Required env (pick one of the first two; URL always required):
 *   NEXT_PUBLIC_SUPABASE_URL — to derive the project ref
 *   SUPABASE_ACCESS_TOKEN    — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_DB_URL          — Project Settings → Database → Connection string
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const DB_URL = process.env.SUPABASE_DB_URL

const rawArgs = process.argv.slice(2).filter((a) => !a.startsWith('dotenv_config_'))
const PRINT_ONLY = rawArgs.includes('--print')
const files = rawArgs.filter((a) => a.endsWith('.sql'))

if (!SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL. Load it from .env.local first.')
  process.exit(1)
}
if (files.length === 0) {
  console.error('No migration file given. e.g. scripts/apply-migration.mjs 43_place_recommendations.sql')
  process.exit(1)
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '').split('.')[0]
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`

function readMigration(filename) {
  const filepath = join(__dirname, '..', 'supabase', 'migrations', filename)
  if (!existsSync(filepath)) throw new Error(`Migration file not found: ${filepath}`)
  return readFileSync(filepath, 'utf8')
}

async function runViaManagementApi(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`Management API ${res.status}: ${(await res.text()).substring(0, 400)}`)
  return res.json()
}

async function runViaPg(sql) {
  let pg
  try {
    pg = await import('pg')
  } catch {
    throw new Error('SUPABASE_DB_URL is set but "pg" is not installed. Run: npm i -D pg')
  }
  const client = new pg.default.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

async function applyOne(filename) {
  const sql = readMigration(filename)
  console.log(`\n📋 Applying: ${filename}  (${sql.length.toLocaleString()} chars)`)
  try {
    if (ACCESS_TOKEN) await runViaManagementApi(sql)
    else if (DB_URL) await runViaPg(sql)
    else throw new Error('NO_CREDENTIALS')
    console.log(`   ✓ ${filename} applied cleanly`)
    return true
  } catch (err) {
    const msg = err.message || String(err)
    if (msg === 'NO_CREDENTIALS') return 'NO_CREDENTIALS'
    if (/already exists|duplicate|42710|42P07/.test(msg)) {
      console.log('   ⏭  Some objects already exist — treating as idempotent success')
      return true
    }
    console.error(`   ✗ ${msg.substring(0, 400)}`)
    return false
  }
}

function printInstructions() {
  console.log('\n' + '━'.repeat(70))
  console.log('NO CREDENTIALS — apply manually')
  console.log('━'.repeat(70))
  console.log('\n  Option A — Access token (recommended):')
  console.log('    1. https://supabase.com/dashboard/account/tokens → generate token')
  console.log('    2. Add SUPABASE_ACCESS_TOKEN=<token> to .env.local')
  console.log('    3. Re-run this command')
  console.log('\n  Option B — Paste SQL by hand (works today):')
  console.log(`    1. Open: ${SQL_EDITOR_URL}`)
  for (const f of files) console.log(`    2. Paste + Run: supabase/migrations/${f}`)
  console.log('')
}

async function main() {
  console.log('=== Migration Runner ===')
  console.log(`Project: ${PROJECT_REF}`)

  if (PRINT_ONLY) {
    for (const f of files) {
      console.log(`\n-- File: supabase/migrations/${f}\n`)
      console.log(readMigration(f))
    }
    return
  }

  if (!ACCESS_TOKEN && !DB_URL) {
    printInstructions()
    process.exit(2)
  }

  console.log(`Auth method: ${ACCESS_TOKEN ? 'Management API (access token)' : 'Direct PG (db url)'}`)
  let errors = 0
  for (const f of files) {
    const r = await applyOne(f)
    if (r === false) errors++
  }
  console.log('')
  if (errors === 0) console.log('✅ Done.')
  else {
    console.log(`⚠️  ${errors} file(s) failed — fallback: paste at ${SQL_EDITOR_URL}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\nFatal:', err.message || err)
  process.exit(1)
})
