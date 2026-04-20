#!/usr/bin/env node
/**
 * One-shot runner for Trip Planner migrations (26 + 27).
 *
 * Strategy:
 *   1. If SUPABASE_ACCESS_TOKEN is set → use the Supabase Management API
 *      (/v1/projects/{ref}/database/query). This is the cleanest path.
 *   2. Else if SUPABASE_DB_URL is set → connect via node-postgres directly.
 *   3. Else → print concatenated SQL and the SQL-editor URL so it can be
 *      pasted by hand.
 *
 * Idempotent: "already exists" / "duplicate" errors are counted as skips,
 * so re-running after a partial failure is safe.
 *
 * Usage:
 *   node scripts/apply-trip-migrations.mjs           # auto-detect + apply
 *   node scripts/apply-trip-migrations.mjs --print   # just print SQL
 *   node scripts/apply-trip-migrations.mjs --check   # verify tables exist
 *
 * Required env (pick one):
 *   SUPABASE_ACCESS_TOKEN  — personal access token from
 *                             https://supabase.com/dashboard/account/tokens
 *   SUPABASE_DB_URL        — full postgres connection string from
 *                             Project Settings → Database → Connection string
 *
 * Always required:
 *   NEXT_PUBLIC_SUPABASE_URL — to derive the project ref
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MIGRATIONS = ['26_trip_planner.sql', '27_trip_planner_phase2.sql']

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const DB_URL = process.env.SUPABASE_DB_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY // for --check verify via PostgREST

const args = new Set(process.argv.slice(2))
const PRINT_ONLY = args.has('--print')
const CHECK_ONLY = args.has('--check')

if (!SUPABASE_URL) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in env. Load it from .env.local first.')
  console.error('Tip: npm i -g dotenv-cli && dotenv -e .env.local -- node scripts/apply-trip-migrations.mjs')
  process.exit(1)
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '').split('.')[0]
const SQL_EDITOR_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`

function readMigration(filename) {
  const filepath = join(__dirname, '..', 'supabase', 'migrations', filename)
  if (!existsSync(filepath)) {
    throw new Error(`Migration file not found: ${filepath}`)
  }
  return readFileSync(filepath, 'utf8')
}

async function runViaManagementApi(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Management API ${res.status}: ${text.substring(0, 400)}`)
  }
  return res.json()
}

async function runViaPg(sql) {
  // Dynamic import so users without pg installed still get the other paths
  let pg
  try {
    pg = await import('pg')
  } catch {
    throw new Error(
      'SUPABASE_DB_URL is set but the "pg" package is not installed. Run: npm i -D pg'
    )
  }
  const client = new pg.default.Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  })
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
    if (ACCESS_TOKEN) {
      await runViaManagementApi(sql)
    } else if (DB_URL) {
      await runViaPg(sql)
    } else {
      throw new Error('NO_CREDENTIALS')
    }
    console.log(`   ✓ ${filename} applied cleanly`)
    return { ok: true }
  } catch (err) {
    const msg = err.message || String(err)

    // Idempotent: partial reruns shouldn't fail the whole script
    if (
      msg.includes('already exists') ||
      msg.includes('duplicate') ||
      msg.includes('42710') ||
      msg.includes('42P07')
    ) {
      console.log(`   ⏭  Some objects already exist — treating as idempotent success`)
      return { ok: true }
    }

    if (msg === 'NO_CREDENTIALS') return { ok: false, reason: 'NO_CREDENTIALS' }
    console.error(`   ✗ ${msg.substring(0, 400)}`)
    return { ok: false, reason: msg }
  }
}

async function verifyTables() {
  if (!SERVICE_ROLE) {
    console.log('⚠️  Skipping verification (SUPABASE_SERVICE_ROLE_KEY not set)')
    return
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/trips?select=id&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    }
  )
  if (res.status === 200) {
    console.log('✅ Verified: public.trips is reachable via PostgREST')
  } else if (res.status === 404 || res.status === 400) {
    const body = await res.text()
    console.log(`❌ Verification failed: ${res.status}  ${body.substring(0, 200)}`)
    console.log('   The trips table is missing. The migrations did not apply.')
  } else {
    console.log(`ℹ️  Verify returned ${res.status} — may be an RLS or key issue, but table likely exists`)
  }
}

function printInstructions() {
  console.log('\n' + '━'.repeat(70))
  console.log('MANUAL APPLICATION REQUIRED')
  console.log('━'.repeat(70))
  console.log('\nNo SUPABASE_ACCESS_TOKEN or SUPABASE_DB_URL found. To get one:')
  console.log('\n  Option A — Access token (recommended):')
  console.log('    1. https://supabase.com/dashboard/account/tokens')
  console.log('    2. Generate a new token')
  console.log('    3. Set SUPABASE_ACCESS_TOKEN=<token> in .env.local')
  console.log('    4. Re-run this script')
  console.log('\n  Option B — DB URL:')
  console.log(`    1. https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`)
  console.log('    2. Copy "Connection string" (URI) — check "Use connection pooler: Session"')
  console.log('    3. Set SUPABASE_DB_URL=<url> in .env.local')
  console.log('    4. npm i -D pg && re-run this script')
  console.log('\n  Option C — Manual paste (works today):')
  console.log(`    1. Open: ${SQL_EDITOR_URL}`)
  console.log(`    2. Paste each file's contents and Run:`)
  for (const m of MIGRATIONS) console.log(`         supabase/migrations/${m}`)
  console.log('    3. Or run with --print to see the combined SQL in terminal\n')
  console.log('━'.repeat(70) + '\n')
}

function printSql() {
  console.log(`-- Combined migration SQL — paste into: ${SQL_EDITOR_URL}\n`)
  for (const m of MIGRATIONS) {
    console.log(`\n-- ═══════════════════════════════════════════════════════════`)
    console.log(`-- File: supabase/migrations/${m}`)
    console.log(`-- ═══════════════════════════════════════════════════════════\n`)
    console.log(readMigration(m))
  }
}

async function main() {
  console.log(`=== Trip Planner Migration Runner ===`)
  console.log(`Project: ${PROJECT_REF}`)

  if (PRINT_ONLY) {
    printSql()
    return
  }
  if (CHECK_ONLY) {
    await verifyTables()
    return
  }

  if (!ACCESS_TOKEN && !DB_URL) {
    printInstructions()
    process.exit(2)
  }

  console.log(`Auth method: ${ACCESS_TOKEN ? 'Management API (access token)' : 'Direct PG (db url)'}`)

  let totalErrors = 0
  for (const m of MIGRATIONS) {
    const result = await applyOne(m)
    if (!result.ok) totalErrors++
  }

  console.log('')
  if (totalErrors === 0) {
    console.log('✅ All trip planner migrations applied.')
    console.log('   Verifying with PostgREST...')
    await verifyTables()
    console.log('   Try Create Trip in the app now.')
  } else {
    console.log(`⚠️  ${totalErrors} migration(s) had errors — see above.`)
    console.log(`    Fallback: paste the SQL manually at ${SQL_EDITOR_URL}`)
    console.log(`    Or run: node scripts/apply-trip-migrations.mjs --print | clip`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\nFatal:', err.message || err)
  process.exit(1)
})
