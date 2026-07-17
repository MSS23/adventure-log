#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const databaseUrl = process.env.SUPABASE_DB_URL
if (!databaseUrl) {
  throw new Error('SUPABASE_DB_URL is required. Use the direct database connection string, never the anon URL.')
}

const outputDir = resolve(process.env.BACKUP_OUTPUT_DIR || '.backups')
mkdirSync(outputDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const dumpPath = join(outputDir, `adventure-log-${stamp}.dump`)

const dump = spawnSync('pg_dump', [
  '--dbname', databaseUrl,
  '--format=custom',
  '--no-owner',
  '--no-acl',
  '--file', dumpPath,
], { stdio: 'inherit', shell: false })

if (dump.error) throw dump.error
if (dump.status !== 0 || !existsSync(dumpPath)) {
  throw new Error(`pg_dump failed with exit code ${dump.status}`)
}

const verify = spawnSync('pg_restore', ['--list', dumpPath], { encoding: 'utf8', shell: false })
if (verify.error) throw verify.error
if (verify.status !== 0 || !verify.stdout.includes('TABLE')) {
  throw new Error('Backup was created but pg_restore could not verify its contents')
}

const sha256 = createHash('sha256').update(readFileSync(dumpPath)).digest('hex')
writeFileSync(`${dumpPath}.sha256`, `${sha256}  ${dumpPath}\n`)
console.log(`Verified backup: ${dumpPath}`)
console.log(`SHA-256: ${sha256}`)
