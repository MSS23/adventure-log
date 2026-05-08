#!/usr/bin/env node
/**
 * Full database + storage reset script
 * Deletes all data, auth users, and storage files
 * Usage: node scripts/reset-database.mjs
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Set them in .env.local or pass as environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function resetDatabase() {
  console.log('=== FULL DATABASE RESET ===\n')

  // 1. Delete all data from tables (order matters for FK constraints)
  const tables = [
    'wishlist_items',
    'album_collaborators',
    'challenge_participants',
    'challenges',
    'album_views',
    'favorites',
    'likes',
    'comments',
    'photos',
    'albums',
    'follows',
    'activity_feed',
    'notifications',
    'stories',
    'users',
  ]

  console.log('1/3  Clearing tables...')
  for (const table of tables) {
    try {
      // Use a filter that matches everything (id is not null)
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log(`  - ${table}: skipped (table not found)`)
        } else {
          console.log(`  - ${table}: error — ${error.message}`)
        }
      } else {
        console.log(`  - ${table}: cleared`)
      }
    } catch (err) {
      console.log(`  - ${table}: skipped (${err.message})`)
    }
  }

  // 2. Delete all auth users
  console.log('\n2/3  Deleting auth users...')
  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listError) {
      console.log(`  Error listing users: ${listError.message}`)
    } else if (users && users.length > 0) {
      console.log(`  Found ${users.length} user(s) to delete`)
      for (const user of users) {
        const { error: delError } = await supabase.auth.admin.deleteUser(user.id)
        if (delError) {
          console.log(`  - ${user.email || user.id}: error — ${delError.message}`)
        } else {
          console.log(`  - ${user.email || user.id}: deleted`)
        }
      }
    } else {
      console.log('  No users found')
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`)
  }

  // 3. Clear storage buckets
  console.log('\n3/3  Clearing storage buckets...')
  const buckets = ['photos', 'avatars']
  for (const bucketId of buckets) {
    try {
      const { data: files, error: listErr } = await supabase.storage.from(bucketId).list('', {
        limit: 1000,
      })
      if (listErr) {
        console.log(`  - ${bucketId}: error listing — ${listErr.message}`)
        continue
      }
      if (!files || files.length === 0) {
        console.log(`  - ${bucketId}: already empty`)
        continue
      }

      // Recursively find all files (including in subdirectories)
      const allFiles = await listAllFiles(bucketId, '')
      if (allFiles.length === 0) {
        console.log(`  - ${bucketId}: already empty`)
        continue
      }

      const { error: removeErr } = await supabase.storage.from(bucketId).remove(allFiles)
      if (removeErr) {
        console.log(`  - ${bucketId}: error removing ${allFiles.length} file(s) — ${removeErr.message}`)
      } else {
        console.log(`  - ${bucketId}: removed ${allFiles.length} file(s)`)
      }
    } catch (err) {
      console.log(`  - ${bucketId}: skipped (${err.message})`)
    }
  }

  console.log('\n=== RESET COMPLETE ===')
  console.log('Your database is now clean. Create a fresh account to get started.')
}

async function listAllFiles(bucketId, prefix) {
  const paths = []
  const { data, error } = await supabase.storage.from(bucketId).list(prefix, { limit: 1000 })
  if (error || !data) return paths

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id) {
      // It's a file
      paths.push(fullPath)
    } else {
      // It's a folder — recurse
      const subFiles = await listAllFiles(bucketId, fullPath)
      paths.push(...subFiles)
    }
  }
  return paths
}

resetDatabase().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
