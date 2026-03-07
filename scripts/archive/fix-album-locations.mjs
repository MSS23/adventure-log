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

async function fixAlbumLocations() {
  console.log('Fixing album location data...\n')

  // Fix the "India" album with location_name "Brazil"
  console.log('1. Fixing "India" album...')
  const { data: indiaAlbum, error: indiaError } = await supabase
    .from('albums')
    .select('*')
    .eq('title', 'India')
    .eq('location_name', 'Brazil')
    .maybeSingle()

  if (indiaError) {
    console.error('Error finding India album:', indiaError)
  } else if (indiaAlbum) {
    console.log(`   Found: "${indiaAlbum.title}" with location "${indiaAlbum.location_name}"`)
    console.log('   → Setting country_code to "BR" (Brazil)')

    const { error: updateError } = await supabase
      .from('albums')
      .update({ country_code: 'BR' })
      .eq('id', indiaAlbum.id)

    if (updateError) {
      console.error('   ✗ Failed:', updateError.message)
    } else {
      console.log('   ✓ Fixed: Added country_code "BR"')
    }
  } else {
    console.log('   Album not found (may already be fixed)')
  }

  // Fix the "Ibiza" album with wrong location
  console.log('\n2. Fixing "Ibiza" album...')
  const { data: ibizaAlbum, error: ibizaError } = await supabase
    .from('albums')
    .select('*')
    .eq('title', 'Ibiza')
    .eq('country_code', 'ES')
    .maybeSingle()

  if (ibizaError) {
    console.error('Error finding Ibiza album:', ibizaError)
  } else if (ibizaAlbum) {
    console.log(`   Found: "${ibizaAlbum.title}" with location "${ibizaAlbum.location_name}"`)

    // Check if location mentions Porto/Portugal
    if (ibizaAlbum.location_name?.toLowerCase().includes('porto')) {
      console.log('   → Updating location_name to "Ibiza, Spain"')

      const { error: updateError } = await supabase
        .from('albums')
        .update({ location_name: 'Ibiza, Spain' })
        .eq('id', ibizaAlbum.id)

      if (updateError) {
        console.error('   ✗ Failed:', updateError.message)
      } else {
        console.log('   ✓ Fixed: Updated location to match country code')
      }
    } else {
      console.log('   → Location looks correct, no changes needed')
    }
  } else {
    console.log('   Album not found (may already be fixed)')
  }

  console.log('\n✅ Album location fixes complete!')
  console.log('\nRun check-country-codes.mjs to verify the changes.')
}

fixAlbumLocations().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
