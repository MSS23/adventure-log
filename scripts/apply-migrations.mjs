#!/usr/bin/env node
/**
 * Apply SQL migrations to Supabase via the REST API.
 * Executes each SQL statement individually using the PostgREST SQL endpoint.
 *
 * Usage: NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/apply-migrations.mjs
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')

async function executeSql(sql) {
  // Use the Supabase Management API SQL endpoint
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const text = await response.text()
    // If Management API doesn't work, try PostgREST rpc
    throw new Error(`API ${response.status}: ${text.substring(0, 200)}`)
  }

  return await response.json()
}

function parseSqlStatements(sql) {
  const statements = []
  let current = ''
  let inDollarQuote = false
  let inSingleQuote = false

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()

    // Skip pure comment lines (not in quotes)
    if (trimmed.startsWith('--') && !inDollarQuote && !inSingleQuote) {
      continue
    }

    current += line + '\n'

    // Track dollar-quoted strings
    const dollarCount = (line.match(/\$\$/g) || []).length
    if (dollarCount % 2 !== 0) inDollarQuote = !inDollarQuote

    // Statement ends with semicolon (not inside dollar quote)
    if (trimmed.endsWith(';') && !inDollarQuote) {
      const stmt = current.trim()
      if (stmt && stmt.length > 3 && stmt !== ';') {
        statements.push(stmt)
      }
      current = ''
    }
  }

  if (current.trim() && current.trim().length > 3) {
    statements.push(current.trim())
  }

  return statements
}

async function applyMigrationFile(filename) {
  const filepath = join(__dirname, '..', 'supabase', 'migrations', filename)
  let sql
  try {
    sql = readFileSync(filepath, 'utf8')
  } catch (err) {
    console.error(`  Cannot read ${filename}: ${err.message}`)
    return 1
  }

  console.log(`\n📋 Applying: ${filename}`)
  const statements = parseSqlStatements(sql)
  console.log(`   ${statements.length} SQL statements found`)

  let success = 0, skipped = 0, errors = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.replace(/\s+/g, ' ').substring(0, 80)

    try {
      await executeSql(stmt)
      success++
      process.stdout.write(`   ✓ [${i + 1}/${statements.length}] ${preview}...\n`)
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('42710')) {
        skipped++
        process.stdout.write(`   ⏭ [${i + 1}/${statements.length}] Already exists\n`)
      } else {
        errors++
        console.error(`   ✗ [${i + 1}/${statements.length}] ${msg.substring(0, 120)}`)
      }
    }
  }

  console.log(`   Result: ${success} applied, ${skipped} skipped, ${errors} errors`)
  return errors
}

async function main() {
  console.log('=== Supabase Migration Runner ===')
  console.log(`Project: ${PROJECT_REF}`)

  // First test the connection
  try {
    await executeSql('SELECT 1 as test')
    console.log('✓ Database connection successful')
  } catch (err) {
    console.error(`✗ Cannot connect to database: ${err.message.substring(0, 200)}`)
    console.log('\nThe Management API may require a Supabase access token instead of service role key.')
    console.log('Alternative: Run these SQL files manually in the Supabase SQL Editor:')
    console.log('  1. supabase/migrations/15_collaborative_albums.sql')
    console.log('  2. supabase/migrations/16_missing_tables.sql')
    process.exit(1)
  }

  const migrations = ['15_collaborative_albums.sql', '16_missing_tables.sql']
  let totalErrors = 0

  for (const m of migrations) {
    totalErrors += await applyMigrationFile(m)
  }

  if (totalErrors === 0) {
    console.log('\n✅ All migrations applied successfully!')
  } else {
    console.log(`\n⚠️  ${totalErrors} errors. Check output above.`)
  }
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
