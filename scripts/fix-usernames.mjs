#!/usr/bin/env node

/**
 * Fix usernames with spaces and ensure uniqueness
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixUsernames() {
  console.log('🔍 Checking for usernames with spaces or issues...\n')

  // 1. Find usernames with spaces
  const { data: usersWithSpaces, error: spaceError } = await supabase
    .from('users')
    .select('id, username, display_name')
    .like('username', '% %')

  if (spaceError) {
    console.error('Error finding users:', spaceError)
    return
  }

  console.log(`Found ${usersWithSpaces?.length || 0} usernames with spaces`)

  if (usersWithSpaces && usersWithSpaces.length > 0) {
    console.log('\n📝 Users with spaces in username:')
    usersWithSpaces.forEach(user => {
      console.log(`  - ${user.username} (ID: ${user.id})`)
      console.log(`    Display: ${user.display_name}`)
    })

    console.log('\n🔧 Fixing usernames...')

    for (const user of usersWithSpaces) {
      // Remove spaces and special characters, convert to lowercase
      const cleanUsername = user.username
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 30)

      console.log(`  ✓ ${user.username} → ${cleanUsername}`)

      const { error: updateError } = await supabase
        .from('users')
        .update({ username: cleanUsername })
        .eq('id', user.id)

      if (updateError) {
        console.error(`    ❌ Failed to update: ${updateError.message}`)
      }
    }
  }

  // 2. Check for duplicate usernames
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, username')
    .order('username')

  if (allUsers) {
    const usernameMap = new Map()
    const duplicates = []

    allUsers.forEach(user => {
      if (usernameMap.has(user.username)) {
        duplicates.push({ ...user, duplicate: usernameMap.get(user.username) })
      } else {
        usernameMap.set(user.username, user.id)
      }
    })

    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate usernames:`)
      duplicates.forEach(dup => {
        console.log(`  - ${dup.username} (IDs: ${dup.id}, ${dup.duplicate})`)
      })
    } else {
      console.log('\n✅ All usernames are unique!')
    }
  }

  console.log('\n✨ Username validation complete!')
}

fixUsernames().catch(console.error)
