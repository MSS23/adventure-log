#!/usr/bin/env node

/**
 * Test-account seeder for Adventure Log.
 *
 * Creates up to N (default 40) realistic-but-clearly-test accounts: an auth
 * user + a public `users` profile row each. Mirrors the proven flow in
 * scripts/seed-demo-data.mjs (auth.admin.createUser -> wait for the
 * create_profile_on_signup trigger -> update/insert the profile).
 *
 * Test accounts are namespaced by the email domain `@test.adventurelog.app`
 * and a deterministic username scheme, so the set is reproducible, idempotent
 * (re-running skips existing), and fully removable with --clear.
 *
 * Loads credentials from .env.local automatically.
 *
 * Usage:
 *   node scripts/seed-test-accounts.mjs                 # dry run (preview)
 *   node scripts/seed-test-accounts.mjs --apply         # create 40 accounts
 *   node scripts/seed-test-accounts.mjs --apply --count 25
 *   node scripts/seed-test-accounts.mjs --clear         # remove test accounts (auth + profile)
 *
 * Credentials for every created account:
 *   email:    <username>@test.adventurelog.app
 *   password: Test123!@#
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---- env -------------------------------------------------------------------
const envPath = join(__dirname, '..', '.env.local')
if (!existsSync(envPath)) {
  console.error('❌ .env.local not found at project root.')
  process.exit(1)
}
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  const key = t.slice(0, i).trim()
  const val = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  if (key && !(key in process.env)) process.env[key] = val
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const CLEAR = argv.includes('--clear')
const EMAIL_DOMAIN = 'test.adventurelog.app'
const PASSWORD = 'Test123!@#'
const countFlagIdx = argv.indexOf('--count')
const COUNT = Math.min(
  Math.max(parseInt(countFlagIdx !== -1 ? argv[countFlagIdx + 1] : '40', 10) || 40, 1),
  200,
)

// ---- deterministic generation ----------------------------------------------
const FIRST = [
  'Maya', 'Liam', 'Aiko', 'Diego', 'Noor', 'Kofi', 'Elena', 'Raj', 'Sofia', 'Mateo',
  'Amara', 'Hiro', 'Lucia', 'Omar', 'Freya', 'Tariq', 'Ines', 'Kai', 'Zara', 'Bruno',
  'Lena', 'Arjun', 'Mei', 'Pablo', 'Nadia', 'Theo', 'Ava', 'Idris', 'Clara', 'Yusuf',
  'Priya', 'Finn', 'Sana', 'Marco', 'Leila', 'Oskar', 'Anika', 'Joel', 'Rosa', 'Emeka',
]
const LAST = [
  'Torres', 'Okafor', 'Nakamura', 'Reyes', 'Haddad', 'Mensah', 'Petrov', 'Kapoor', 'Costa', 'Silva',
  'Diallo', 'Sato', 'Romano', 'Khan', 'Berg', 'Aziz', 'Moreau', 'Lim', 'Novak', 'Santos',
  'Ivanova', 'Mehta', 'Chen', 'Garcia', 'Hassan', 'Larsen', 'Walsh', 'Bello', 'Fischer', 'Demir',
  'Nair', 'Murphy', 'Rahman', 'Bianchi', 'Saidi', 'Lindqvist', 'Sharma', 'Adams', 'Vargas', 'Eze',
]
const BIOS = [
  'Chasing sunsets and street food 🌅',
  'Weekend wanderer · 12 countries so far',
  'Mountains > everything ⛰️',
  'Slow travel, long coffees, good books ☕',
  'Diver, hiker, perpetual planner of next trips',
  'Collecting passport stamps and playlists',
  'Here for the food and the views 🍜',
  'Solo traveler figuring it out as I go',
  'Trains, trails, and tiny villages',
  'Photographer pretending to be a nomad 📸',
  'Always one flight away from happy ✈️',
  'Map enthusiast. Souvenir minimalist.',
]
// Unsplash portrait pool (already an allowed image domain) — cycled for variety.
const AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&q=80',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&q=80',
]

/**
 * Build the deterministic list of test accounts. Logins are simple and
 * memorable so testers can sign in easily:
 *   username: testuser1 … testuserN
 *   email:    testuser1@test.adventurelog.app … (this is the login)
 *   password: Test123!@#  (shared, see PASSWORD)
 * A friendly display name + bio + avatar are still attached so the app has
 * varied content to test against.
 */
function buildAccounts(n) {
  const accounts = []
  for (let i = 0; i < n; i++) {
    const num = i + 1
    accounts.push({
      username: `testuser${num}`,
      display_name: `Test User ${num}`,
      bio: BIOS[i % BIOS.length],
      avatar_url: AVATARS[i % AVATARS.length],
      // Mix in some private accounts (every 6th) to exercise privacy flows.
      privacy_level: num % 6 === 0 ? 'private' : 'public',
      email: `testuser${num}@${EMAIL_DOMAIN}`,
    })
  }
  return accounts
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function createAccounts(accounts) {
  let created = 0
  let skipped = 0
  for (const a of accounts) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', a.username)
      .maybeSingle()

    if (existing) {
      console.log(`⏭️  ${a.username} already exists`)
      skipped++
      continue
    }

    if (!APPLY) {
      console.log(`Would create: @${a.username} (${a.display_name}) [${a.privacy_level}]`)
      continue
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: a.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: a.display_name },
    })
    if (authError || !authData?.user) {
      console.error(`❌ auth create failed for ${a.username}: ${authError?.message}`)
      continue
    }

    // Let the create_profile_on_signup trigger run, then upsert our fields.
    await sleep(400)
    const profileFields = {
      username: a.username,
      display_name: a.display_name,
      bio: a.bio,
      avatar_url: a.avatar_url,
      privacy_level: a.privacy_level,
    }

    const { data: auto } = await supabase
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle()

    let err
    if (auto) {
      ;({ error: err } = await supabase.from('users').update(profileFields).eq('id', authData.user.id))
    } else {
      ;({ error: err } = await supabase
        .from('users')
        .insert({ id: authData.user.id, created_at: new Date().toISOString(), ...profileFields }))
    }

    if (err) {
      console.error(`❌ profile failed for ${a.username}: ${err.message}`)
      continue
    }
    console.log(`✅ @${a.username} (${a.display_name}) [${a.privacy_level}]`)
    created++
  }
  return { created, skipped }
}

async function clearAccounts(accounts) {
  const usernames = accounts.map((a) => a.username)
  const { data: rows } = await supabase.from('users').select('id, username').in('username', usernames)
  if (!rows || rows.length === 0) {
    console.log('No test accounts found to clear.')
    return
  }
  const ids = rows.map((r) => r.id)
  console.log(`Found ${ids.length} test accounts to remove.`)

  if (!APPLY) {
    console.log('Dry run — re-run with --clear --apply to actually delete.')
    return
  }

  // Remove dependent content first (FK-safe order), then the profile rows,
  // then the auth users so nothing is orphaned.
  for (const table of ['likes', 'comments', 'stories', 'photos', 'albums']) {
    const { error } = await supabase.from(table).delete().in('user_id', ids)
    if (error) console.error(`⚠️  ${table}: ${error.message}`)
  }
  // follows is keyed by follower_id/following_id (no user_id column).
  await supabase.from('follows').delete().in('follower_id', ids)
  await supabase.from('follows').delete().in('following_id', ids)
  await supabase.from('users').delete().in('id', ids)
  for (const id of ids) {
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) console.error(`⚠️  auth delete ${id}: ${error.message}`)
  }
  console.log(`✅ Removed ${ids.length} test accounts (auth + profile + content).`)
}

async function main() {
  const accounts = buildAccounts(COUNT)
  console.log('\n🧪 Adventure Log — Test Account Seeder')
  console.log('='.repeat(48))
  console.log(`Project: ${SUPABASE_URL}`)
  console.log(`Mode:    ${CLEAR ? 'CLEAR' : APPLY ? 'APPLY' : 'DRY RUN'}  |  Count: ${COUNT}`)
  console.log('='.repeat(48) + '\n')

  if (CLEAR) {
    await clearAccounts(accounts)
    return
  }

  const { created, skipped } = await createAccounts(accounts)

  if (!APPLY) {
    console.log(`\n📊 Dry run: would create ${COUNT - skipped} new account(s), ${skipped} already exist.`)
    console.log('💡 Re-run with --apply to create them.\n')
    return
  }
  console.log('\n' + '='.repeat(48))
  console.log(`✅ Done. Created ${created}, skipped ${skipped} (already existed).`)
  console.log(`🔑 Login: <username>@${EMAIL_DOMAIN}  /  password: ${PASSWORD}`)
  console.log('🗑️  Remove later: node scripts/seed-test-accounts.mjs --clear --apply\n')
}

main().catch((e) => {
  console.error('\n❌ Fatal:', e)
  process.exit(1)
})
