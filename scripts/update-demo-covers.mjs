#!/usr/bin/env node

/**
 * Update Demo Album Cover Photos
 *
 * Updates existing demo albums with cover photo URLs without recreating users.
 *
 * Usage:
 *   node scripts/update-demo-covers.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

// Map of album titles to Unsplash cover images
const ALBUM_COVERS = {
  'Paris in Spring': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80',
  'Iceland Road Trip': 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&h=600&fit=crop&q=80',
  'Greek Islands Hopping': 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&h=600&fit=crop&q=80',
  'Barcelona Architecture': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop&q=80',
  'Scottish Highlands': 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=800&h=600&fit=crop&q=80',
  'Tokyo Neon Nights': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop&q=80',
  'Bali Yoga Retreat': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop&q=80',
  'Bangkok Street Food Tour': 'https://images.unsplash.com/photo-1508009603885-50cf7c579c59?w=800&h=600&fit=crop&q=80',
  'Vietnam Coastal Journey': 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=600&fit=crop&q=80',
  'Seoul K-Culture Experience': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&h=600&fit=crop&q=80',
  'New York City Marathon': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop&q=80',
  'Patagonia Trekking': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop&q=80',
  'Costa Rica Wildlife': 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&h=600&fit=crop&q=80',
  'Canadian Rockies Road Trip': 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&h=600&fit=crop&q=80',
  'Mexico City Art & Food': 'https://images.unsplash.com/photo-1518659526054-e54fda44cb0f?w=800&h=600&fit=crop&q=80',
  'Marrakech Souks Adventure': 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&h=600&fit=crop&q=80',
  'Safari in Tanzania': 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80',
  'Dubai Luxury Escape': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80',
  'Great Barrier Reef Diving': 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&h=600&fit=crop&q=80',
  'New Zealand South Island': 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&h=600&fit=crop&q=80'
}

async function main() {
  console.log('\n🖼️  Updating Demo Album Cover Photos\n')
  console.log('=' .repeat(50) + '\n')

  let updated = 0
  let notFound = 0

  for (const [title, coverUrl] of Object.entries(ALBUM_COVERS)) {
    // Find all albums by title (handles duplicates)
    const { data: albums, error: findError } = await supabase
      .from('albums')
      .select('id, title, cover_photo_url')
      .eq('title', title)

    if (findError) {
      console.error(`❌ Error finding "${title}":`, findError.message)
      continue
    }

    if (!albums || albums.length === 0) {
      console.log(`⏭️  Album not found: "${title}"`)
      notFound++
      continue
    }

    // Update all matching albums
    for (const album of albums) {
      // Skip if already has the same cover
      if (album.cover_photo_url === coverUrl) {
        console.log(`✓  Already set: "${title}"`)
        continue
      }

      // Update album with cover photo
      const { error: updateError } = await supabase
        .from('albums')
        .update({ cover_photo_url: coverUrl })
        .eq('id', album.id)

      if (updateError) {
        console.error(`❌ Error updating "${title}":`, updateError.message)
        continue
      }

      console.log(`✅ Updated: "${title}"`)
      updated++
    }
  }

  console.log('\n' + '=' .repeat(50))
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Updated: ${updated} albums`)
  console.log(`   ⏭️  Not found: ${notFound} albums`)
  console.log(`   Total processed: ${Object.keys(ALBUM_COVERS).length} albums\n`)
}

main().catch(console.error)
