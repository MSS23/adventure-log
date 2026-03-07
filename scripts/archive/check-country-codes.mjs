import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function checkCountryCodes() {
  console.log('Checking albums for country code issues...\n')

  // Get all albums with location data
  const { data: albums, error } = await supabase
    .from('albums')
    .select('id, title, location_name, country_code, latitude, longitude')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching albums:', error)
    return
  }

  console.log(`Found ${albums.length} albums\n`)

  // Group albums by country code
  const byCountry = {}
  const missingCountryCode = []
  const invalidCoords = []

  for (const album of albums) {
    if (!album.country_code) {
      missingCountryCode.push(album)
      continue
    }

    if (!album.latitude || !album.longitude) {
      invalidCoords.push(album)
    }

    if (!byCountry[album.country_code]) {
      byCountry[album.country_code] = []
    }
    byCountry[album.country_code].push(album)
  }

  // Show results
  console.log('=== Albums by Country Code ===')
  for (const [code, albumList] of Object.entries(byCountry).sort()) {
    console.log(`\n${code}: ${albumList.length} albums`)
    for (const album of albumList.slice(0, 3)) {
      console.log(`  - "${album.title}" (${album.location_name || 'no location'})`)
    }
    if (albumList.length > 3) {
      console.log(`  ... and ${albumList.length - 3} more`)
    }
  }

  if (missingCountryCode.length > 0) {
    console.log(`\n=== Albums Missing Country Code: ${missingCountryCode.length} ===`)
    for (const album of missingCountryCode.slice(0, 5)) {
      console.log(`  - "${album.title}" (${album.location_name || 'no location'})`)
    }
    if (missingCountryCode.length > 5) {
      console.log(`  ... and ${missingCountryCode.length - 5} more`)
    }
  }

  if (invalidCoords.length > 0) {
    console.log(`\n=== Albums with Country Code but Missing Coordinates: ${invalidCoords.length} ===`)
    for (const album of invalidCoords.slice(0, 5)) {
      console.log(`  - "${album.title}" (${album.country_code}, ${album.location_name || 'no location'})`)
    }
    if (invalidCoords.length > 5) {
      console.log(`  ... and ${invalidCoords.length - 5} more`)
    }
  }

  console.log('\n✅ Country code check complete!')
}

checkCountryCodes().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
