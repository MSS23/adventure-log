/**
 * scrub-photo-gps — remove stored GPS data from existing photo rows.
 *
 * New uploads are stripped automatically (see src/lib/utils/prepare-upload.ts),
 * but rows created before that change may still have GPS in the queryable DB:
 *   - photos.latitude / photos.longitude / photos.altitude
 *   - the `location` object inside photos.exif_data
 *
 * This nulls those out. It does NOT re-strip bytes from already-uploaded image
 * files in storage (best-effort follow-up; the downloadable copy keeps its EXIF
 * until re-uploaded). Album-level pins (albums.latitude/longitude) are untouched.
 *
 * Usage:
 *   node scripts/scrub-photo-gps.mjs            # dry run (report only)
 *   node scripts/scrub-photo-gps.mjs --apply    # actually update rows
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

const APPLY = process.argv.includes('--apply')
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log(APPLY ? '🚀 APPLY mode — rows will be updated\n' : '🔍 DRY RUN — no changes will be made (pass --apply to write)\n')

  const pageSize = 500
  let from = 0
  let scanned = 0
  let toScrub = 0
  let updated = 0

  for (;;) {
    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, latitude, longitude, altitude, exif_data')
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('❌ Failed to fetch photos:', error.message)
      process.exit(1)
    }

    if (!photos || photos.length === 0) break
    scanned += photos.length

    for (const photo of photos) {
      const hasColumnGps =
        photo.latitude != null || photo.longitude != null || photo.altitude != null
      const exif = photo.exif_data && typeof photo.exif_data === 'object' ? photo.exif_data : null
      const hasExifLocation = !!(exif && exif.location)

      if (!hasColumnGps && !hasExifLocation) continue
      toScrub++

      const update = { latitude: null, longitude: null, altitude: null }
      if (hasExifLocation) {
        const { location, ...rest } = exif
        update.exif_data = rest
      }

      if (APPLY) {
        const { error: updateError } = await supabase
          .from('photos')
          .update(update)
          .eq('id', photo.id)

        if (updateError) {
          console.error(`  ⚠️  Failed to scrub photo ${photo.id}:`, updateError.message)
        } else {
          updated++
        }
      }
    }

    if (photos.length < pageSize) break
    from += pageSize
  }

  console.log(`\nScanned:        ${scanned} photos`)
  console.log(`With GPS data:  ${toScrub}`)
  if (APPLY) {
    console.log(`Scrubbed:       ${updated}`)
    console.log('\n✅ Done.')
  } else {
    console.log('\nRun again with --apply to scrub these rows.')
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
