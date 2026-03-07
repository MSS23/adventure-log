#!/usr/bin/env node

/**
 * Fix existing demo users - update their profiles with proper usernames and data
 * Then create albums and social interactions
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEMO_USERS = [
  { username: 'adventure_alex', display_name: 'Alex Chen', bio: 'World traveler & photographer 📸 | 45 countries & counting', email: 'adventure_alex@demo.adventurelog.app' },
  { username: 'wanderlust_sarah', display_name: 'Sarah Johnson', bio: 'Solo female traveler | Foodie | Digital nomad', email: 'wanderlust_sarah@demo.adventurelog.app' },
  { username: 'backpack_ben', display_name: 'Ben Williams', bio: 'Budget backpacker | Adventure seeker | Nature lover', email: 'backpack_ben@demo.adventurelog.app' },
  { username: 'luxury_lisa', display_name: 'Lisa Martinez', bio: '5-star hotels & fine dining | Luxury travel curator', email: 'luxury_lisa@demo.adventurelog.app' },
  { username: 'culture_carlos', display_name: 'Carlos Rodriguez', bio: 'Cultural explorer | Museum enthusiast | History buff', email: 'culture_carlos@demo.adventurelog.app' },
  { username: 'beach_bella', display_name: 'Bella Thompson', bio: 'Island hopper 🏝️ | Scuba diver | Sunset chaser', email: 'beach_bella@demo.adventurelog.app' },
  { username: 'mountain_mike', display_name: 'Mike Anderson', bio: 'Mountaineer | Hiker | Ski enthusiast', email: 'mountain_mike@demo.adventurelog.app' },
  { username: 'foodie_fiona', display_name: 'Fiona Lee', bio: 'Eating my way around the world 🍜 | Food blogger', email: 'foodie_fiona@demo.adventurelog.app' },
  { username: 'photo_paul', display_name: 'Paul Davies', bio: 'Travel photographer | Drone pilot | Storyteller', email: 'photo_paul@demo.adventurelog.app' },
  { username: 'yoga_yuki', display_name: 'Yuki Tanaka', bio: 'Yoga instructor | Wellness retreats | Mindful traveler', email: 'yoga_yuki@demo.adventurelog.app' }
]

const DEMO_ALBUMS = [
  // Europe
  { title: 'Paris in Spring', location_name: 'Paris, France', country_code: 'FR', latitude: 48.8566, longitude: 2.3522, description: 'Exploring the City of Lights during the most beautiful season. From the Eiffel Tower to hidden cafés in Le Marais.', date_start: '2024-04-15', date_end: '2024-04-22' },
  { title: 'Iceland Road Trip', location_name: 'Reykjavik, Iceland', country_code: 'IS', latitude: 64.1466, longitude: -21.9426, description: 'Chasing waterfalls, glaciers, and the Northern Lights on the Ring Road.', date_start: '2024-09-10', date_end: '2024-09-20' },
  { title: 'Greek Islands Hopping', location_name: 'Santorini, Greece', country_code: 'GR', latitude: 36.3932, longitude: 25.4615, description: 'White-washed houses, blue domes, and endless Mediterranean views.', date_start: '2024-06-05', date_end: '2024-06-18' },
  { title: 'Barcelona Architecture', location_name: 'Barcelona, Spain', country_code: 'ES', latitude: 41.3851, longitude: 2.1734, description: 'Gaudí\'s masterpieces, tapas bars, and beach life in Catalonia.', date_start: '2024-05-20', date_end: '2024-05-27' },
  { title: 'Scottish Highlands', location_name: 'Edinburgh, Scotland', country_code: 'GB', latitude: 55.9533, longitude: -3.1883, description: 'Castles, lochs, and whisky distilleries.', date_start: '2024-08-12', date_end: '2024-08-19' },
  { title: 'Tokyo Neon Nights', location_name: 'Tokyo, Japan', country_code: 'JP', latitude: 35.6762, longitude: 139.6503, description: 'Shibuya crossing, ramen alleys, and cherry blossoms.', date_start: '2024-03-25', date_end: '2024-04-05' },
  { title: 'Bali Yoga Retreat', location_name: 'Ubud, Bali', country_code: 'ID', latitude: -8.5069, longitude: 115.2625, description: 'Rice terraces, monkey forests, and sunrise yoga.', date_start: '2024-02-10', date_end: '2024-02-24' },
  { title: 'Bangkok Street Food Tour', location_name: 'Bangkok, Thailand', country_code: 'TH', latitude: 13.7563, longitude: 100.5018, description: 'Temple hopping and amazing street food.', date_start: '2024-01-15', date_end: '2024-01-22' },
  { title: 'Vietnam Coastal Journey', location_name: 'Hanoi, Vietnam', country_code: 'VN', latitude: 21.0285, longitude: 105.8542, description: 'From Hanoi to Ho Chi Minh through Halong Bay.', date_start: '2024-11-01', date_end: '2024-11-14' },
  { title: 'Seoul K-Culture', location_name: 'Seoul, South Korea', country_code: 'KR', latitude: 37.5665, longitude: 126.9780, description: 'Palaces, K-pop, and Korean BBQ.', date_start: '2024-10-05', date_end: '2024-10-12' },
  { title: 'New York City Marathon', location_name: 'New York, USA', country_code: 'US', latitude: 40.7128, longitude: -74.0060, description: 'Running through all five boroughs.', date_start: '2024-11-03', date_end: '2024-11-10' },
  { title: 'Patagonia Trekking', location_name: 'El Calafate, Argentina', country_code: 'AR', latitude: -50.3373, longitude: -72.2647, description: 'Glaciers and the W Trek in Torres del Paine.', date_start: '2024-12-15', date_end: '2024-12-28' },
  { title: 'Costa Rica Wildlife', location_name: 'San José, Costa Rica', country_code: 'CR', latitude: 9.9281, longitude: -84.0907, description: 'Sloths, monkeys, and zip-lining.', date_start: '2024-07-08', date_end: '2024-07-21' },
  { title: 'Canadian Rockies', location_name: 'Banff, Canada', country_code: 'CA', latitude: 51.1784, longitude: -115.5708, description: 'Lake Louise and Moraine Lake.', date_start: '2024-08-01', date_end: '2024-08-10' },
  { title: 'Mexico City Art & Food', location_name: 'Mexico City, Mexico', country_code: 'MX', latitude: 19.4326, longitude: -99.1332, description: 'Frida Kahlo museum and street tacos.', date_start: '2024-09-15', date_end: '2024-09-22' },
  { title: 'Marrakech Souks', location_name: 'Marrakech, Morocco', country_code: 'MA', latitude: 31.6295, longitude: -7.9811, description: 'Getting lost in the medina and riding camels.', date_start: '2024-10-18', date_end: '2024-10-28' },
  { title: 'Safari in Tanzania', location_name: 'Serengeti, Tanzania', country_code: 'TZ', latitude: -2.1540, longitude: 34.6857, description: 'The Great Migration and Big Five sightings.', date_start: '2024-06-20', date_end: '2024-07-03' },
  { title: 'Dubai Luxury Escape', location_name: 'Dubai, UAE', country_code: 'AE', latitude: 25.2048, longitude: 55.2708, description: 'Burj Khalifa and desert safaris.', date_start: '2024-12-01', date_end: '2024-12-08' },
  { title: 'Great Barrier Reef', location_name: 'Cairns, Australia', country_code: 'AU', latitude: -16.9186, longitude: 145.7781, description: 'Scuba diving with sea turtles.', date_start: '2024-03-10', date_end: '2024-03-20' },
  { title: 'New Zealand South Island', location_name: 'Queenstown, New Zealand', country_code: 'NZ', latitude: -45.0312, longitude: 168.6626, description: 'Bungee jumping and Milford Sound.', date_start: '2024-02-05', date_end: '2024-02-18' }
]

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function main() {
  console.log('🔧 Fixing demo users...\n')

  const fixedUsers = []

  // Update existing auth users' profiles
  for (const userData of DEMO_USERS) {
    // Get auth user by email
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error listing users:', authError.message)
      continue
    }

    const authUser = authUsers.users.find(u => u.email === userData.email)

    if (!authUser) {
      console.log(`⏭️  No auth user found for ${userData.email}`)
      continue
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('users')
      .update({
        username: userData.username,
        display_name: userData.display_name,
        bio: userData.bio,
        privacy_level: 'public'
      })
      .eq('id', authUser.id)
      .select()
      .single()

    if (updateError) {
      console.error(`❌ Error updating ${userData.username}:`, updateError.message)
    } else {
      fixedUsers.push(updatedProfile)
      console.log(`✅ Fixed ${userData.username}`)
    }
  }

  console.log(`\n✅ Fixed ${fixedUsers.length} users\n`)

  // Create albums
  console.log('📸 Creating albums...\n')
  let albumsCreated = 0

  for (let i = 0; i < DEMO_ALBUMS.length && i < fixedUsers.length * 2; i++) {
    const albumData = DEMO_ALBUMS[i]
    const user = fixedUsers[i % fixedUsers.length]

    const { error } = await supabase
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
        visibility: 'public',
        is_featured: Math.random() > 0.7
      })

    if (!error) {
      albumsCreated++
      console.log(`✅ Created "${albumData.title}"`)
    }
  }

  console.log(`\n✅ Created ${albumsCreated} albums\n`)
  console.log('🎉 Done! Check your live site now!')
}

main().catch(console.error)
