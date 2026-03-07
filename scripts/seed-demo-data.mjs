#!/usr/bin/env node

/**
 * Demo Data Seeder for Adventure Log
 *
 * Populates the database with diverse, realistic travel content for testing and demonstrations.
 *
 * Usage:
 *   # Dry run (preview only)
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-demo-data.mjs
 *
 *   # Apply changes
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-demo-data.mjs --apply
 *
 *   # Clear all demo data
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-demo-data.mjs --clear
 *
 *   # Make YOUR account follow all demo users (so their content shows in your feed)
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/seed-demo-data.mjs --follow-demos YOUR_USER_ID
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APPLY_CHANGES = process.argv.includes('--apply')
const CLEAR_DATA = process.argv.includes('--clear')
const FOLLOW_DEMOS = process.argv.includes('--follow-demos')
// Get user ID if provided after --follow-demos (e.g., --follow-demos abc123)
const FOLLOW_USER_ID = FOLLOW_DEMOS ? process.argv[process.argv.indexOf('--follow-demos') + 1] : null

// Demo data constants - Real avatar URLs from Unsplash (diverse portraits)
const DEMO_USERS = [
  {
    username: 'adventure_alex',
    display_name: 'Alex Chen',
    bio: 'World traveler & photographer 📸 | 45 countries & counting',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'wanderlust_sarah',
    display_name: 'Sarah Johnson',
    bio: 'Solo female traveler | Foodie | Digital nomad',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'backpack_ben',
    display_name: 'Ben Williams',
    bio: 'Budget backpacker | Adventure seeker | Nature lover',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'luxury_lisa',
    display_name: 'Lisa Martinez',
    bio: '5-star hotels & fine dining | Luxury travel curator',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'culture_carlos',
    display_name: 'Carlos Rodriguez',
    bio: 'Cultural explorer | Museum enthusiast | History buff',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'beach_bella',
    display_name: 'Bella Thompson',
    bio: 'Island hopper 🏝️ | Scuba diver | Sunset chaser',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'mountain_mike',
    display_name: 'Mike Anderson',
    bio: 'Mountaineer | Hiker | Ski enthusiast',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'foodie_fiona',
    display_name: 'Fiona Lee',
    bio: 'Eating my way around the world 🍜 | Food blogger',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'photo_paul',
    display_name: 'Paul Davies',
    bio: 'Travel photographer | Drone pilot | Storyteller',
    avatar_url: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&q=80'
  },
  {
    username: 'yoga_yuki',
    display_name: 'Yuki Tanaka',
    bio: 'Yoga instructor | Wellness retreats | Mindful traveler',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80'
  }
]

const DEMO_ALBUMS = [
  // Europe
  { title: 'Paris in Spring', location_name: 'Paris, France', country_code: 'FR', latitude: 48.8566, longitude: 2.3522, description: 'Exploring the City of Lights during the most beautiful season. From the Eiffel Tower to hidden cafés in Le Marais.', date_start: '2024-04-15', date_end: '2024-04-22', cover_photo_url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80' },
  { title: 'Iceland Road Trip', location_name: 'Reykjavik, Iceland', country_code: 'IS', latitude: 64.1466, longitude: -21.9426, description: 'Chasing waterfalls, glaciers, and the Northern Lights on the Ring Road.', date_start: '2024-09-10', date_end: '2024-09-20', cover_photo_url: 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&h=600&fit=crop&q=80' },
  { title: 'Greek Islands Hopping', location_name: 'Santorini, Greece', country_code: 'GR', latitude: 36.3932, longitude: 25.4615, description: 'White-washed houses, blue domes, and endless Mediterranean views. Mykonos, Santorini, and Crete.', date_start: '2024-06-05', date_end: '2024-06-18', cover_photo_url: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&h=600&fit=crop&q=80' },
  { title: 'Barcelona Architecture', location_name: 'Barcelona, Spain', country_code: 'ES', latitude: 41.3851, longitude: 2.1734, description: 'Gaudí\'s masterpieces, tapas bars, and beach life in Catalonia.', date_start: '2024-05-20', date_end: '2024-05-27', cover_photo_url: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop&q=80' },
  { title: 'Scottish Highlands', location_name: 'Edinburgh, Scotland', country_code: 'GB', latitude: 55.9533, longitude: -3.1883, description: 'Castles, lochs, and whisky distilleries in the misty highlands.', date_start: '2024-08-12', date_end: '2024-08-19', cover_photo_url: 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=800&h=600&fit=crop&q=80' },

  // Asia
  { title: 'Tokyo Neon Nights', location_name: 'Tokyo, Japan', country_code: 'JP', latitude: 35.6762, longitude: 139.6503, description: 'Shibuya crossing, ramen alleys, and cherry blossoms in Ueno Park.', date_start: '2024-03-25', date_end: '2024-04-05', cover_photo_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80' },
  { title: 'Bali Yoga Retreat', location_name: 'Ubud, Bali', country_code: 'ID', latitude: -8.5069, longitude: 115.2625, description: 'Rice terraces, monkey forests, and sunrise yoga at our villa.', date_start: '2024-02-10', date_end: '2024-02-24', cover_photo_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop&q=80' },
  { title: 'Bangkok Street Food Tour', location_name: 'Bangkok, Thailand', country_code: 'TH', latitude: 13.7563, longitude: 100.5018, description: 'Temple hopping and eating the best pad thai, mango sticky rice, and tom yum.', date_start: '2024-01-15', date_end: '2024-01-22', cover_photo_url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579c59?w=800&h=600&fit=crop&q=80' },
  { title: 'Vietnam Coastal Journey', location_name: 'Hanoi, Vietnam', country_code: 'VN', latitude: 21.0285, longitude: 105.8542, description: 'From Hanoi to Ho Chi Minh, through Halong Bay and Hoi An.', date_start: '2024-11-01', date_end: '2024-11-14', cover_photo_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=600&fit=crop&q=80' },
  { title: 'Seoul K-Culture Experience', location_name: 'Seoul, South Korea', country_code: 'KR', latitude: 37.5665, longitude: 126.9780, description: 'Palaces, K-pop, street fashion, and Korean BBQ everywhere.', date_start: '2024-10-05', date_end: '2024-10-12', cover_photo_url: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&h=600&fit=crop&q=80' },

  // Americas
  { title: 'New York City Marathon', location_name: 'New York, USA', country_code: 'US', latitude: 40.7128, longitude: -74.0060, description: 'Running through all five boroughs and exploring the city that never sleeps.', date_start: '2024-11-03', date_end: '2024-11-10', cover_photo_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80' },
  { title: 'Patagonia Trekking', location_name: 'El Calafate, Argentina', country_code: 'AR', latitude: -50.3373, longitude: -72.2647, description: 'Glaciers, mountains, and the W Trek in Torres del Paine.', date_start: '2024-12-15', date_end: '2024-12-28', cover_photo_url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop&q=80' },
  { title: 'Costa Rica Wildlife', location_name: 'San José, Costa Rica', country_code: 'CR', latitude: 9.9281, longitude: -84.0907, description: 'Sloths, monkeys, and zip-lining through the rainforest canopy.', date_start: '2024-07-08', date_end: '2024-07-21', cover_photo_url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&h=600&fit=crop&q=80' },
  { title: 'Canadian Rockies Road Trip', location_name: 'Banff, Canada', country_code: 'CA', latitude: 51.1784, longitude: -115.5708, description: 'Lake Louise, Moraine Lake, and wildlife spotting in Jasper.', date_start: '2024-08-01', date_end: '2024-08-10', cover_photo_url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&h=600&fit=crop&q=80' },
  { title: 'Mexico City Art & Food', location_name: 'Mexico City, Mexico', country_code: 'MX', latitude: 19.4326, longitude: -99.1332, description: 'Frida Kahlo museum, street tacos, and colorful neighborhoods.', date_start: '2024-09-15', date_end: '2024-09-22', cover_photo_url: 'https://images.unsplash.com/photo-1518659526054-e54fda44cb0f?w=800&h=600&fit=crop&q=80' },

  // Africa & Middle East
  { title: 'Marrakech Souks Adventure', location_name: 'Marrakech, Morocco', country_code: 'MA', latitude: 31.6295, longitude: -7.9811, description: 'Getting lost in the medina, riding camels in the Sahara, and mint tea everywhere.', date_start: '2024-10-18', date_end: '2024-10-28', cover_photo_url: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&h=600&fit=crop&q=80' },
  { title: 'Safari in Tanzania', location_name: 'Serengeti, Tanzania', country_code: 'TZ', latitude: -2.1540, longitude: 34.6857, description: 'The Great Migration, Big Five sightings, and camping under African stars.', date_start: '2024-06-20', date_end: '2024-07-03', cover_photo_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80' },
  { title: 'Dubai Luxury Escape', location_name: 'Dubai, UAE', country_code: 'AE', latitude: 25.2048, longitude: 55.2708, description: 'Burj Khalifa, desert safaris, and shopping in the world\'s largest mall.', date_start: '2024-12-01', date_end: '2024-12-08', cover_photo_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80' },

  // Oceania
  { title: 'Great Barrier Reef Diving', location_name: 'Cairns, Australia', country_code: 'AU', latitude: -16.9186, longitude: 145.7781, description: 'Scuba diving with sea turtles, colorful coral, and tropical fish.', date_start: '2024-03-10', date_end: '2024-03-20', cover_photo_url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&h=600&fit=crop&q=80' },
  { title: 'New Zealand South Island', location_name: 'Queenstown, New Zealand', country_code: 'NZ', latitude: -45.0312, longitude: 168.6626, description: 'Bungee jumping, Milford Sound cruise, and Lord of the Rings locations.', date_start: '2024-02-05', date_end: '2024-02-18', cover_photo_url: 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&h=600&fit=crop&q=80' }
]

// Validate environment
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

/**
 * Clear all demo data
 */
async function clearDemoData() {
  console.log('🗑️  Clearing demo data...\n')

  try {
    // Get demo users
    const { data: demoUsers } = await supabase
      .from('users')
      .select('id')
      .in('username', DEMO_USERS.map(u => u.username))

    if (!demoUsers || demoUsers.length === 0) {
      console.log('No demo data found to clear.')
      return
    }

    const userIds = demoUsers.map(u => u.id)
    console.log(`Found ${userIds.length} demo users`)

    // Delete in correct order (respecting foreign keys)
    const deletions = [
      { table: 'notifications', label: 'notifications' },
      { table: 'album_shares', label: 'album shares' },
      { table: 'album_collaborators', label: 'album collaborators' },
      { table: 'comments', label: 'comments' },
      { table: 'likes', label: 'likes' },
      { table: 'follows', label: 'follows' },
      { table: 'stories', label: 'stories' },
      { table: 'photos', label: 'photos' },
      { table: 'albums', label: 'albums' },
      { table: 'users', label: 'users' }
    ]

    for (const { table, label } of deletions) {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .in('user_id', userIds)

      if (error) {
        console.error(`❌ Error deleting ${label}:`, error.message)
      } else {
        console.log(`✅ Deleted ${count || 0} ${label}`)
      }
    }

    console.log('\n✅ Demo data cleared successfully!')

  } catch (error) {
    console.error('❌ Error clearing demo data:', error)
    throw error
  }
}

/**
 * Create demo users
 */
async function createDemoUsers() {
  console.log('👥 Creating demo users...\n')

  const createdUsers = []

  for (const userData of DEMO_USERS) {
    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', userData.username)
      .single()

    if (existing) {
      console.log(`⏭️  User ${userData.username} already exists`)
      createdUsers.push(existing)
      continue
    }

    if (!APPLY_CHANGES) {
      console.log(`Would create: ${userData.username} (${userData.display_name})`)
      continue
    }

    // Create auth user
    const email = `${userData.username}@demo.adventurelog.app`
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'Demo123!@#', // Default password for demo users
      email_confirm: true,
      user_metadata: {
        display_name: userData.display_name
      }
    })

    if (authError) {
      console.error(`❌ Error creating auth user ${userData.username}:`, authError.message)
      continue
    }

    // Wait a moment for triggers to run
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if profile was auto-created by trigger
    const { data: autoProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (autoProfile) {
      // Update the auto-created profile with our data
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({
          username: userData.username,
          display_name: userData.display_name,
          bio: userData.bio,
          avatar_url: userData.avatar_url,
          privacy_level: 'public'
        })
        .eq('id', authData.user.id)
        .select()
        .single()

      if (updateError) {
        console.error(`❌ Error updating profile for ${userData.username}:`, updateError.message)
        // Still add the user so we can create albums
        createdUsers.push(autoProfile)
      } else {
        createdUsers.push(updatedProfile)
        console.log(`✅ Created ${userData.username} (${userData.display_name})`)
      }
    } else {
      // Create profile manually
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          username: userData.username,
          display_name: userData.display_name,
          bio: userData.bio,
          avatar_url: userData.avatar_url,
          privacy_level: 'public',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (profileError) {
        console.error(`❌ Error creating profile for ${userData.username}:`, profileError.message)
        continue
      }

      createdUsers.push(profile)
      console.log(`✅ Created ${userData.username} (${userData.display_name})`)
    }
  }

  console.log(`\n✅ Created ${createdUsers.length} demo users\n`)
  return createdUsers
}

/**
 * Create demo albums
 */
async function createDemoAlbums(users) {
  console.log('📸 Creating demo albums...\n')

  if (users.length === 0) {
    console.log('No users available to create albums')
    return []
  }

  const createdAlbums = []

  for (let i = 0; i < DEMO_ALBUMS.length; i++) {
    const albumData = DEMO_ALBUMS[i]
    const user = users[i % users.length] // Distribute albums across users

    if (!APPLY_CHANGES) {
      console.log(`Would create: "${albumData.title}" for ${user.username}`)
      continue
    }

    const { data: album, error } = await supabase
      .from('albums')
      .insert({
        user_id: user.id,
        title: albumData.title,
        description: albumData.description,
        location_name: albumData.location_name,
        country_code: albumData.country_code,
        latitude: albumData.latitude,
        longitude: albumData.longitude,
        date_start: albumData.date_start,
        date_end: albumData.date_end,
        cover_photo_url: albumData.cover_photo_url,
        visibility: 'public',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ Error creating album "${albumData.title}":`, error.message)
      continue
    }

    // Create a photo record for the album so it shows on album detail page
    const { error: photoError } = await supabase
      .from('photos')
      .insert({
        album_id: album.id,
        user_id: user.id,
        file_path: albumData.cover_photo_url, // Use the Unsplash URL directly
        caption: `Cover photo for ${albumData.title}`,
        display_order: 0,
        created_at: new Date().toISOString()
      })

    if (photoError) {
      console.error(`⚠️  Warning: Could not create photo for "${albumData.title}":`, photoError.message)
    }

    createdAlbums.push(album)
    console.log(`✅ Created "${albumData.title}" for ${user.username}`)
  }

  console.log(`\n✅ Created ${createdAlbums.length} demo albums\n`)
  return createdAlbums
}

/**
 * Create demo social interactions
 */
async function createDemoSocialInteractions(users, albums) {
  console.log('❤️  Creating demo social interactions...\n')

  if (users.length === 0 || albums.length === 0) {
    console.log('Not enough data to create interactions')
    return
  }

  let likesCount = 0
  let commentsCount = 0
  let followsCount = 0

  // Create follows (each user follows 3-5 random others)
  for (const user of users) {
    const numFollows = Math.floor(Math.random() * 3) + 3
    const otherUsers = users.filter(u => u.id !== user.id)
    const toFollow = otherUsers.sort(() => 0.5 - Math.random()).slice(0, numFollows)

    for (const followed of toFollow) {
      if (!APPLY_CHANGES) continue

      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: followed.id,
          status: 'accepted',
          created_at: new Date().toISOString()
        })

      if (!error) followsCount++
    }
  }

  // Create likes (random users like random albums)
  for (const album of albums) {
    const numLikes = Math.floor(Math.random() * 5) + 2
    const likers = users.sort(() => 0.5 - Math.random()).slice(0, numLikes)

    for (const user of likers) {
      if (!APPLY_CHANGES) continue

      const { error } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          target_type: 'album',
          target_id: album.id,
          created_at: new Date().toISOString()
        })

      if (!error) likesCount++
    }
  }

  // Create comments (random users comment on random albums)
  const commentTemplates = [
    'Amazing photos! This looks incredible 😍',
    'Adding this to my bucket list!',
    'How many days did you spend here?',
    'Wow, I went there last year too! Such a beautiful place.',
    'This is making me want to book a flight right now ✈️',
    'The photos don\'t do it justice I bet!',
    'Thanks for sharing this! Very inspiring.',
    'What was your favorite part of the trip?',
    'Absolutely stunning! 🌟',
    'I need to visit here someday!'
  ]

  for (const album of albums) {
    const numComments = Math.floor(Math.random() * 4) + 1
    const commenters = users.sort(() => 0.5 - Math.random()).slice(0, numComments)

    for (const user of commenters) {
      if (user.id === album.user_id) continue // Don't comment on own album
      if (!APPLY_CHANGES) continue

      const comment = commentTemplates[Math.floor(Math.random() * commentTemplates.length)]

      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          target_type: 'album',
          target_id: album.id,
          content: comment,
          created_at: new Date().toISOString()
        })

      if (!error) commentsCount++
    }
  }

  console.log(`✅ Created ${followsCount} follows`)
  console.log(`✅ Created ${likesCount} likes`)
  console.log(`✅ Created ${commentsCount} comments\n`)
}

/**
 * Make a real user follow all demo users
 * This allows demo content to appear in the user's feed
 */
async function followDemoUsers(realUserId) {
  console.log('\n🔗 Making your account follow demo users...\n')

  // Verify the user exists
  const { data: realUser, error: userError } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', realUserId)
    .single()

  if (userError || !realUser) {
    console.error('❌ Could not find user with ID:', realUserId)
    console.error('   Make sure you use your actual user ID from Supabase.')
    return
  }

  console.log(`Found user: @${realUser.username}\n`)

  // Get all demo users by their usernames
  const { data: demoUsers, error: demoError } = await supabase
    .from('users')
    .select('id, username')
    .in('username', DEMO_USERS.map(u => u.username))

  if (demoError || !demoUsers?.length) {
    console.error('❌ Could not find demo users. Have you run the seed script first?')
    console.error('   Run: node scripts/seed-demo-data.mjs --apply')
    return
  }

  console.log(`Found ${demoUsers.length} demo users to follow:\n`)

  let followsCreated = 0

  for (const demoUser of demoUsers) {
    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', realUserId)
      .eq('following_id', demoUser.id)
      .single()

    if (existingFollow) {
      console.log(`⏭️  Already following @${demoUser.username}`)
      continue
    }

    // Create the follow
    const { error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: realUserId,
        following_id: demoUser.id,
        status: 'accepted',
        created_at: new Date().toISOString()
      })

    if (followError) {
      console.error(`❌ Error following @${demoUser.username}:`, followError.message)
    } else {
      console.log(`✅ Now following @${demoUser.username}`)
      followsCreated++
    }
  }

  console.log(`\n✅ Created ${followsCreated} new follows`)
  console.log('\n💡 Demo content should now appear in your feed!')
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🌍 Adventure Log Demo Data Seeder\n')
  console.log('=' .repeat(50))
  console.log(`Mode: ${FOLLOW_DEMOS ? 'FOLLOW DEMOS' : CLEAR_DATA ? 'CLEAR' : APPLY_CHANGES ? 'APPLY' : 'DRY RUN'}`)
  console.log('=' .repeat(50) + '\n')

  try {
    // Handle --follow-demos flag
    if (FOLLOW_DEMOS) {
      if (!FOLLOW_USER_ID || FOLLOW_USER_ID.startsWith('--')) {
        console.error('❌ Please provide your user ID after --follow-demos')
        console.error('   Usage: node scripts/seed-demo-data.mjs --follow-demos YOUR_USER_ID')
        console.error('\n💡 You can find your user ID in the Supabase dashboard under Authentication > Users')
        return
      }
      await followDemoUsers(FOLLOW_USER_ID)
      return
    }

    if (CLEAR_DATA) {
      await clearDemoData()
      return
    }

    // Step 1: Create users
    const users = await createDemoUsers()

    if (!APPLY_CHANGES) {
      console.log('\n📊 Summary (Dry Run):')
      console.log(`   Would create ${DEMO_USERS.length} users`)
      console.log(`   Would create ${DEMO_ALBUMS.length} albums`)
      console.log(`   Would create social interactions (likes, comments, follows)`)
      console.log('\n💡 Run with --apply flag to execute changes')
      return
    }

    // Step 2: Create albums
    const albums = await createDemoAlbums(users)

    // Step 3: Create social interactions
    await createDemoSocialInteractions(users, albums)

    console.log('=' .repeat(50))
    console.log('✅ Demo data seeded successfully!')
    console.log('=' .repeat(50))
    console.log('\n📊 Summary:')
    console.log(`   ✅ ${users.length} demo users`)
    console.log(`   ✅ ${albums.length} demo albums`)
    console.log(`   ✅ Social interactions created`)
    console.log('\n🔑 Demo Credentials:')
    console.log(`   Email format: username@demo.adventurelog.app`)
    console.log(`   Password (all): Demo123!@#`)
    console.log('\n💡 To clear demo data: node scripts/seed-demo-data.mjs --clear\n')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run
main()
