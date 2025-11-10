#!/usr/bin/env node

/**
 * Script to add sample achievements for testing
 * Run with: node scripts/add-sample-achievements.mjs [user-id]
 */

import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Sample achievements to add
const SAMPLE_ACHIEVEMENTS = [
  {
    achievement_type: 'explorer',
    achievement_name: 'Explorer',
    description: 'Visited 5 or more countries',
    icon_emoji: '🗺️'
  },
  {
    achievement_type: 'travel_enthusiast',
    achievement_name: 'Travel Enthusiast',
    description: 'Created 20 or more albums',
    icon_emoji: '✈️'
  },
  {
    achievement_type: 'photographer',
    achievement_name: 'Photographer',
    description: 'Uploaded 500 or more photos',
    icon_emoji: '📸'
  },
  {
    achievement_type: 'globe_trotter',
    achievement_name: 'Globe Trotter',
    description: 'Visited 10 or more countries',
    icon_emoji: '🌍'
  },
  {
    achievement_type: 'social_butterfly',
    achievement_name: 'Social Butterfly',
    description: 'Connected with 50 or more travelers',
    icon_emoji: '🦋'
  }
]

async function addSampleAchievements(userId) {
  console.log(`\n🎖️  Adding sample achievements for user: ${userId}\n`)

  let addedCount = 0
  let skippedCount = 0

  for (const achievement of SAMPLE_ACHIEVEMENTS) {
    const { data, error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        ...achievement
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`⏭️  Skipped: ${achievement.achievement_name} (already exists)`)
        skippedCount++
      } else {
        console.error(`❌ Error adding ${achievement.achievement_name}:`, error.message)
      }
    } else {
      console.log(`✅ Added: ${achievement.achievement_name} ${achievement.icon_emoji}`)
      addedCount++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Added: ${addedCount} achievements`)
  console.log(`   ⏭️  Skipped: ${skippedCount} achievements`)
  console.log(`\n✨ Done!\n`)
}

async function getCurrentUser() {
  // Get the first user from the database
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name')
    .limit(1)
    .single()

  if (error) {
    console.error('❌ Error fetching user:', error.message)
    return null
  }

  return data
}

async function main() {
  const args = process.argv.slice(2)
  let userId = args[0]

  if (!userId) {
    console.log('ℹ️  No user ID provided, fetching current user...')
    const user = await getCurrentUser()

    if (!user) {
      console.error('\n❌ No user found. Please provide a user ID as argument.')
      console.error('   Usage: node scripts/add-sample-achievements.mjs [user-id]\n')
      process.exit(1)
    }

    userId = user.id
    console.log(`✅ Found user: ${user.display_name || user.username} (${userId})`)
  }

  await addSampleAchievements(userId)
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
