/**
 * Script to populate missing latitude/longitude coordinates for albums
 * that have location_name but missing geographic coordinates
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Rate limiting for Nominatim API (max 1 request per second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function geocodeLocation(locationName) {
  try {
    // Nominatim geocoding API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'AdventureLog/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`)
    }

    const data = await response.json()

    if (data && data.length > 0) {
      const result = data[0]

      // Extract country code from address if available
      let countryCode = null
      if (result.address && result.address.country_code) {
        countryCode = result.address.country_code.toUpperCase()
      } else {
        // Try to extract from location name (last part after comma)
        const parts = locationName.split(',').map(p => p.trim())
        if (parts.length > 0) {
          const country = parts[parts.length - 1]
          // Simple country name to code mapping (you could expand this)
          const countryMap = {
            'Spain': 'ES',
            'France': 'FR',
            'Italy': 'IT',
            'Germany': 'DE',
            'United Kingdom': 'GB',
            'United States': 'US',
            // Add more as needed
          }
          countryCode = countryMap[country] || null
        }
      }

      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        country_code: countryCode
      }
    }

    return null
  } catch (error) {
    console.error(`  ⚠️  Geocoding error for "${locationName}":`, error.message)
    return null
  }
}

async function populateAlbumCoordinates(dryRun = true) {
  console.log('🔍 Fetching albums with missing coordinates...\n')

  // Fetch albums that have location_name but missing latitude or longitude
  const { data: albums, error } = await supabase
    .from('albums')
    .select('id, title, location_name, latitude, longitude, country_code, user_id')
    .not('location_name', 'is', null)
    .or('latitude.is.null,longitude.is.null')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Failed to fetch albums:', error.message)
    process.exit(1)
  }

  if (!albums || albums.length === 0) {
    console.log('✅ No albums found with missing coordinates!')
    return
  }

  console.log(`📋 Found ${albums.length} album(s) with missing coordinates\n`)

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
    console.log('Albums that would be updated:')
    albums.forEach((album, index) => {
      console.log(`${index + 1}. "${album.title}" - ${album.location_name}`)
    })
    console.log('\n💡 Run with --apply flag to actually update the albums')
    return
  }

  console.log('🚀 Starting geocoding and updates...\n')

  let successCount = 0
  let failCount = 0

  for (const album of albums) {
    console.log(`📍 Processing: "${album.title}" (${album.location_name})`)

    // Geocode the location
    const coordinates = await geocodeLocation(album.location_name)

    if (coordinates) {
      // Update the album with coordinates
      const updateData = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      }

      // Only update country_code if it's missing and we found one
      if (!album.country_code && coordinates.country_code) {
        updateData.country_code = coordinates.country_code
      }

      const { error: updateError } = await supabase
        .from('albums')
        .update(updateData)
        .eq('id', album.id)

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`)
        failCount++
      } else {
        console.log(`  ✅ Updated: ${coordinates.latitude}, ${coordinates.longitude}`)
        if (coordinates.country_code) {
          console.log(`     Country: ${coordinates.country_code}`)
        }
        successCount++
      }
    } else {
      console.log(`  ⚠️  Could not geocode location`)
      failCount++
    }

    // Rate limiting: wait 1 second between requests
    await delay(1000)
    console.log('')
  }

  console.log('=' .repeat(60))
  console.log(`\n📊 Summary:`)
  console.log(`   ✅ Successfully updated: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   📋 Total processed: ${albums.length}`)
  console.log('')
}

// Check if --apply flag is passed
const applyChanges = process.argv.includes('--apply')

populateAlbumCoordinates(!applyChanges)
  .then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
