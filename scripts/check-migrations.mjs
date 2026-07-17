#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

dotenv.config({ path: '.env.local' })

const dir = join(process.cwd(), 'supabase', 'migrations')
const expected = Number(readFileSync(join(dir, 'EXPECTED_VERSION'), 'utf8').trim())
const files = readdirSync(dir).filter((name) => name.endsWith('.sql'))
const parsed = files.map((name) => {
  const match = name.match(/^(\d+)_/)
  if (!match) throw new Error(`Unversioned migration: ${name}`)
  return { name, version: Number(match[1]) }
})
const latest = Math.max(...parsed.map(({ version }) => version))

if (latest !== expected) {
  throw new Error(`EXPECTED_VERSION is ${expected}, but latest migration is ${latest}`)
}

const duplicates = [...new Set(parsed.map(({ version }) => version))]
  .filter((version) => parsed.filter((item) => item.version === version).length > 1)
if (duplicates.length > 0) {
  console.warn(`WARN legacy duplicate migration versions: ${duplicates.join(', ')}`)
}

console.log(`PASS migration files: ${files.length} SQL files, expected schema v${expected}`)

if (process.argv.includes('--remote')) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Remote check requires Supabase URL and anon key')
  const { data, error } = await createClient(url, key, { auth: { persistSession: false } })
    .rpc('get_app_schema_version')
  if (error) throw new Error(`Remote schema check failed: ${error.message}`)
  if (data !== expected) throw new Error(`Remote schema is v${data}; application expects v${expected}`)
  console.log(`PASS remote schema: v${data}`)
}
