#!/usr/bin/env node

/**
 * Create (or re-sync) 10 pre-confirmed test accounts you can hand out to
 * people so they can log in to Adventure Log immediately — no email
 * confirmation step required.
 *
 * Usage:
 *   node scripts/create-test-accounts.mjs            # create / re-sync accounts
 *   node scripts/create-test-accounts.mjs --reset    # also reset passwords on existing accounts
 *
 * Requires (read from the environment):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (admin key — bypasses RLS, never ship to client)
 *
 * Idempotent: re-running updates existing accounts instead of erroring.
 * Prints a clean credentials table at the end to copy/paste and share.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESET_PASSWORDS = process.argv.includes('--reset')

// One shared password keeps it simple to communicate. Change here if you like.
const SHARED_PASSWORD = 'AdventureLog2026!'

// Emails use a domain you don't need to own — these accounts are
// confirmed via the admin API, so no mail is ever sent.
const TEST_ACCOUNTS = [
  { username: 'explorer_one',   display_name: 'Explorer One',   email: 'tester1@adventurelog.test' },
  { username: 'explorer_two',   display_name: 'Explorer Two',   email: 'tester2@adventurelog.test' },
  { username: 'explorer_three', display_name: 'Explorer Three', email: 'tester3@adventurelog.test' },
  { username: 'explorer_four',  display_name: 'Explorer Four',  email: 'tester4@adventurelog.test' },
  { username: 'explorer_five',  display_name: 'Explorer Five',  email: 'tester5@adventurelog.test' },
  { username: 'explorer_six',   display_name: 'Explorer Six',   email: 'tester6@adventurelog.test' },
  { username: 'explorer_seven', display_name: 'Explorer Seven', email: 'tester7@adventurelog.test' },
  { username: 'explorer_eight', display_name: 'Explorer Eight', email: 'tester8@adventurelog.test' },
  { username: 'explorer_nine',  display_name: 'Explorer Nine',  email: 'tester9@adventurelog.test' },
  { username: 'explorer_ten',   display_name: 'Explorer Ten',   email: 'tester10@adventurelog.test' },
  { username: 'explorer_eleven',   display_name: 'Explorer Eleven',   email: 'tester11@adventurelog.test' },
  { username: 'explorer_twelve',   display_name: 'Explorer Twelve',   email: 'tester12@adventurelog.test' },
  { username: 'explorer_thirteen', display_name: 'Explorer Thirteen', email: 'tester13@adventurelog.test' },
  { username: 'explorer_fourteen', display_name: 'Explorer Fourteen', email: 'tester14@adventurelog.test' },
  { username: 'explorer_fifteen',  display_name: 'Explorer Fifteen',  email: 'tester15@adventurelog.test' },
  { username: 'explorer_sixteen',  display_name: 'Explorer Sixteen',  email: 'tester16@adventurelog.test' },
  { username: 'explorer_seventeen', display_name: 'Explorer Seventeen', email: 'tester17@adventurelog.test' },
  { username: 'explorer_eighteen', display_name: 'Explorer Eighteen', email: 'tester18@adventurelog.test' },
  { username: 'explorer_nineteen', display_name: 'Explorer Nineteen', email: 'tester19@adventurelog.test' },
  { username: 'explorer_twenty',   display_name: 'Explorer Twenty',   email: 'tester20@adventurelog.test' },
]

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\n❌ Missing environment variables.')
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, e.g.:\n')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \\')
  console.error('     node scripts/create-test-accounts.mjs\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Page through all auth users so we can detect ones that already exist.
async function findExistingUser(email) {
  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < perPage) return null
    page += 1
  }
}

async function main() {
  console.log(`\n🔑 Creating ${TEST_ACCOUNTS.length} pre-confirmed test accounts...\n`)

  const results = []

  for (const acct of TEST_ACCOUNTS) {
    let userId
    const existing = await findExistingUser(acct.email)

    if (existing) {
      userId = existing.id
      const updates = { email_confirm: true, user_metadata: { display_name: acct.display_name } }
      if (RESET_PASSWORDS) updates.password = SHARED_PASSWORD
      const { error } = await supabase.auth.admin.updateUserById(userId, updates)
      if (error) {
        console.error(`❌ ${acct.email}: ${error.message}`)
        continue
      }
      console.log(`♻️  Re-synced ${acct.email}${RESET_PASSWORDS ? ' (password reset)' : ''}`)
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: acct.email,
        password: SHARED_PASSWORD,
        email_confirm: true, // pre-confirmed: they can log in right away
        user_metadata: { display_name: acct.display_name },
      })
      if (error) {
        console.error(`❌ ${acct.email}: ${error.message}`)
        continue
      }
      userId = data.user.id
      console.log(`✅ Created ${acct.email}`)
    }

    // The create_profile_on_signup trigger inserts a row with a generated
    // username; overwrite it with a friendly one. Small delay lets the
    // trigger land first so the row exists to update.
    await new Promise((r) => setTimeout(r, 250))
    const { error: profileError } = await supabase
      .from('users')
      .update({
        username: acct.username,
        display_name: acct.display_name,
        privacy_level: 'public',
      })
      .eq('id', userId)

    if (profileError) {
      // Fall back to an upsert in case the trigger hasn't created the row.
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: userId,
            username: acct.username,
            display_name: acct.display_name,
            privacy_level: 'public',
          },
          { onConflict: 'id' },
        )
      if (upsertError) {
        console.warn(`   ⚠️  profile not set for ${acct.username}: ${upsertError.message}`)
      }
    }

    results.push({ email: acct.email, password: SHARED_PASSWORD, username: acct.username })
  }

  console.log('\n────────────────────────────────────────────────────────────')
  console.log(' TEST ACCOUNT CREDENTIALS  (log in at /login with email + password)')
  console.log('────────────────────────────────────────────────────────────')
  console.log(' #   Email                              Password')
  console.log('────────────────────────────────────────────────────────────')
  results.forEach((r, i) => {
    const n = String(i + 1).padEnd(3)
    console.log(` ${n} ${r.email.padEnd(34)} ${r.password}`)
  })
  console.log('────────────────────────────────────────────────────────────')
  console.log(`\n✅ ${results.length} accounts ready. All share the password: ${SHARED_PASSWORD}\n`)
}

main().catch((err) => {
  console.error('\n💥 Failed:', err.message)
  process.exit(1)
})
