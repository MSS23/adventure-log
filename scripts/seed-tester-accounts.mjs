#!/usr/bin/env node

/**
 * Tester-account seeder for Adventure Log.
 *
 * Ensures 40 pre-confirmed login accounts exist:
 *   email:    tester1@adventurelog.test … tester40@adventurelog.test
 *   password: AdventureLog2026!   (reset on every run so it's always known)
 *   username: tester1 … tester40  (existing accounts keep their username)
 *
 * Idempotent: re-running creates any missing accounts and resets the password
 * on the ones that already exist. Accounts that already hold real uploaded
 * content (e.g. the explorer_six / explorer_fourteen testers) keep their
 * profile + albums untouched — only their password is reset.
 *
 * Loads credentials from .env.local automatically.
 *
 * Usage:
 *   node scripts/seed-tester-accounts.mjs            # dry run (preview)
 *   node scripts/seed-tester-accounts.mjs --apply    # create/repair 40 accounts
 *   node scripts/seed-tester-accounts.mjs --apply --count 40
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
const EMAIL_DOMAIN = 'adventurelog.test'
const PASSWORD = 'AdventureLog2026!'
const countFlagIdx = argv.indexOf('--count')
const COUNT = Math.min(
  Math.max(parseInt(countFlagIdx !== -1 ? argv[countFlagIdx + 1] : '40', 10) || 40, 1),
  200,
)

const BIOS = [
  'Chasing sunsets and street food 🌅',
  'Weekend wanderer · collecting stamps',
  'Mountains > everything ⛰️',
  'Slow travel, long coffees, good books ☕',
  'Diver, hiker, perpetual trip-planner',
  'Here for the food and the views 🍜',
  'Solo traveler figuring it out as I go',
  'Trains, trails, and tiny villages',
  'Always one flight away from happy ✈️',
  'Map enthusiast. Souvenir minimalist.',
]

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  console.log('\n🧪 Adventure Log — Tester Account Seeder')
  console.log('='.repeat(52))
  console.log(`Project: ${SUPABASE_URL}`)
  console.log(`Mode:    ${APPLY ? 'APPLY' : 'DRY RUN'}  |  Count: ${COUNT}`)
  console.log(`Login:   tester1..tester${COUNT}@${EMAIL_DOMAIN}  /  ${PASSWORD}`)
  console.log('='.repeat(52) + '\n')

  // Map existing auth users by email so we can repair rather than duplicate.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    console.error('❌ Could not list users:', listErr.message)
    process.exit(1)
  }
  const byEmail = new Map(list.users.map((u) => [u.email?.toLowerCase(), u]))

  let created = 0
  let reset = 0

  for (let n = 1; n <= COUNT; n++) {
    const email = `tester${n}@${EMAIL_DOMAIN}`
    const existing = byEmail.get(email)

    if (existing) {
      if (!APPLY) {
        console.log(`Would reset password: ${email}`)
        continue
      }
      const { error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: PASSWORD,
        email_confirm: true,
      })
      if (error) {
        console.error(`❌ reset failed for ${email}: ${error.message}`)
        continue
      }
      // Make sure a profile row exists so the account is usable in-app.
      const { data: prof } = await supabase.from('users').select('id').eq('id', existing.id).maybeSingle()
      if (!prof) {
        await supabase.from('users').insert({
          id: existing.id,
          username: `tester${n}`,
          display_name: `Tester ${n}`,
          bio: BIOS[(n - 1) % BIOS.length],
          privacy_level: 'public',
          created_at: new Date().toISOString(),
        })
      }
      console.log(`🔑 reset ${email}`)
      reset++
      continue
    }

    if (!APPLY) {
      console.log(`Would create: ${email} (@tester${n})`)
      continue
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: `Tester ${n}` },
    })
    if (authError || !authData?.user) {
      console.error(`❌ create failed for ${email}: ${authError?.message}`)
      continue
    }

    // Let the create_profile_on_signup trigger run, then set our fields.
    await sleep(400)
    const profileFields = {
      username: `tester${n}`,
      display_name: `Tester ${n}`,
      bio: BIOS[(n - 1) % BIOS.length],
      privacy_level: 'public',
    }
    const { data: auto } = await supabase.from('users').select('id').eq('id', authData.user.id).maybeSingle()
    const { error: pErr } = auto
      ? await supabase.from('users').update(profileFields).eq('id', authData.user.id)
      : await supabase.from('users').insert({ id: authData.user.id, created_at: new Date().toISOString(), ...profileFields })
    if (pErr) {
      console.error(`⚠️  profile failed for ${email}: ${pErr.message}`)
    }
    console.log(`✅ created ${email} (@tester${n})`)
    created++
  }

  console.log('\n' + '='.repeat(52))
  if (!APPLY) {
    console.log('Dry run — re-run with --apply to create/repair the accounts.')
  } else {
    console.log(`✅ Done. Created ${created}, password-reset ${reset}.`)
    console.log(`🔑 Login: tester<N>@${EMAIL_DOMAIN}  (N = 1..${COUNT})  /  ${PASSWORD}`)
  }
  console.log('='.repeat(52) + '\n')
}

main().catch((e) => {
  console.error('\n❌ Fatal:', e)
  process.exit(1)
})
