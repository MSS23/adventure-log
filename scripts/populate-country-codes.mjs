/**
 * Script to populate missing country_code for albums using reverse geocoding
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

async function reverseGeocode(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'AdventureLog/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`)
    }

    const data = await response.json()

    if (data && data.address && data.address.country_code) {
      return data.address.country_code.toUpperCase()
    }

    return null
  } catch (error) {
    console.error(`  ⚠️  Reverse geocoding error:`, error.message)
    return null
  }
}

function extractCountryCodeFromLocationName(locationName) {
  // Simple fallback: extract country from location name
  const parts = locationName.split(',').map(p => p.trim())
  if (parts.length === 0) return null

  const country = parts[parts.length - 1]

  // Simple country name to code mapping
  const countryMap = {
    'Spain': 'ES',
    'France': 'FR',
    'Italy': 'IT',
    'Germany': 'DE',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'United States': 'US',
    'USA': 'US',
    'Portugal': 'PT',
    'Greece': 'GR',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Switzerland': 'CH',
    'Austria': 'AT',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Poland': 'PL',
    'Czech Republic': 'CZ',
    'Ireland': 'IE',
    'Iceland': 'IS',
    'Croatia': 'HR',
    'Turkey': 'TR',
    'Japan': 'JP',
    'China': 'CN',
    'Thailand': 'TH',
    'Singapore': 'SG',
    'Australia': 'AU',
    'New Zealand': 'NZ',
    'Canada': 'CA',
    'Mexico': 'MX',
    'Brazil': 'BR',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Peru': 'PE',
    'Colombia': 'CO',
    'South Africa': 'ZA',
    'Egypt': 'EG',
    'Morocco': 'MA',
    'India': 'IN',
    'South Korea': 'KR',
    'Indonesia': 'ID',
    'Malaysia': 'MY',
    'Philippines': 'PH',
    'Vietnam': 'VN',
    'United Arab Emirates': 'AE',
    'UAE': 'AE',
    'Saudi Arabia': 'SA'
  }

  return countryMap[country] || null
}

async function populateCountryCodes(dryRun = true) {
  console.log('🔍 Fetching albums with missing country_code...\n')

  // Fetch albums that are missing country_code
  const { data: albums, error } = await supabase
    .from('albums')
    .select('id, title, location_name, latitude, longitude, country_code')
    .is('country_code', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Failed to fetch albums:', error.message)
    process.exit(1)
  }

  if (!albums || albums.length === 0) {
    console.log('✅ No albums found with missing country_code!')
    return
  }

  console.log(`📋 Found ${albums.length} album(s) with missing country_code\n`)

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
    console.log('Albums that would be updated:')
    albums.forEach((album, index) => {
      console.log(`${index + 1}. "${album.title}" - ${album.location_name}`)
      console.log(`   Coords: ${album.latitude}, ${album.longitude}`)
    })
    console.log('\n💡 Run with --apply flag to actually update the albums')
    return
  }

  console.log('🚀 Starting country code population...\n')

  let successCount = 0
  let failCount = 0

  for (const album of albums) {
    console.log(`📍 Processing: "${album.title}" (${album.location_name})`)

    let countryCode = null

    // Try reverse geocoding if coordinates are available
    if (album.latitude && album.longitude) {
      console.log(`   🌍 Reverse geocoding coordinates...`)
      countryCode = await reverseGeocode(album.latitude, album.longitude)
      await delay(1100) // Rate limit: 1 request per second
    }

    // Fallback: extract from location_name
    if (!countryCode && album.location_name) {
      console.log(`   📝 Extracting from location name...`)
      countryCode = extractCountryCodeFromLocationName(album.location_name)
    }

    if (countryCode) {
      // Update the album with country_code
      const { error: updateError } = await supabase
        .from('albums')
        .update({ country_code: countryCode })
        .eq('id', album.id)

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`)
        failCount++
      } else {
        console.log(`  ✅ Updated with country code: ${countryCode}`)
        successCount++
      }
    } else {
      console.log(`  ⚠️  Could not determine country code`)
      failCount++
    }

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

populateCountryCodes(!applyChanges)
  .then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
