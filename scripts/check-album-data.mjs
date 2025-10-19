/**
 * Script to check current state of album location data
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAlbumData() {
  console.log('🔍 Fetching all albums...\n')

  const { data: albums, error } = await supabase
    .from('albums')
    .select('id, title, location_name, latitude, longitude, country_code')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`📊 Found ${albums.length} album(s)\n`)

  albums.forEach((album, index) => {
    console.log(`${index + 1}. "${album.title}"`)
    console.log(`   Location Name: ${album.location_name || '❌ NOT SET'}`)
    console.log(`   Latitude: ${album.latitude !== null ? album.latitude : '❌ NOT SET'}`)
    console.log(`   Longitude: ${album.longitude !== null ? album.longitude : '❌ NOT SET'}`)
    console.log(`   Country Code: ${album.country_code || '❌ NOT SET'}`)
    console.log('')
  })

  // Summary
  const withLocationName = albums.filter(a => a.location_name).length
  const withCoordinates = albums.filter(a => a.latitude !== null && a.longitude !== null).length
  const withCountryCode = albums.filter(a => a.country_code).length
  const needsCoordinates = albums.filter(a => a.location_name && (a.latitude === null || a.longitude === null)).length

  console.log('=' .repeat(60))
  console.log('\n📈 Summary:')
  console.log(`   Albums with location_name: ${withLocationName}`)
  console.log(`   Albums with coordinates: ${withCoordinates}`)
  console.log(`   Albums with country_code: ${withCountryCode}`)
  console.log(`   Albums needing coordinates: ${needsCoordinates}`)
  console.log('')
}

checkAlbumData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
