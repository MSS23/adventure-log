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

async function fixIndiaAlbum() {
  console.log('Fixing India album data mismatch...\n')

  // Get the India album
  const { data: album, error: fetchError } = await supabase
    .from('albums')
    .select('*')
    .eq('title', 'India')
    .eq('country_code', 'IN')
    .maybeSingle()

  if (fetchError) {
    console.error('Error fetching album:', fetchError)
    return
  }

  if (!album) {
    console.log('India album not found')
    return
  }

  console.log('Found album:')
  console.log(`  Title: ${album.title}`)
  console.log(`  Location Name: ${album.location_name}`)
  console.log(`  Country Code: ${album.country_code}`)
  console.log(`  Coordinates: ${album.latitude}, ${album.longitude}`)
  console.log()

  // The album has country_code "IN" which is correct for India
  // But location_name is "Brazil" which is wrong
  // Let's fix it to "India"
  console.log('Updating location_name to match country_code...')

  const { error: updateError } = await supabase
    .from('albums')
    .update({
      location_name: 'India'
    })
    .eq('id', album.id)

  if (updateError) {
    console.error('✗ Failed to update:', updateError.message)
  } else {
    console.log('✓ Successfully updated location_name to "India"')
  }

  console.log('\n✅ Fix complete!')
}

fixIndiaAlbum().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
