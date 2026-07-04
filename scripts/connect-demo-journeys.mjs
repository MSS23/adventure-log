/**
 * connect-demo-journeys.mjs
 *
 * Populates the journey-connection feature (migration 75,
 * albums.connected_from_album_id) on the seeded demo accounts so the globe
 * shows a realistic "spider's web": each demo traveler gets a few short
 * connected journeys AND some standalone (unconnected) trips.
 *
 * Idempotent: it first clears connections on the demo users' albums, then
 * re-links them, so re-running produces the same result. Only ever touches the
 * DEMO_USERNAMES accounts — never real users.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/connect-demo-journeys.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

// Keep in sync with DEMO_USERS in seed-demo-data.mjs.
const DEMO_USERNAMES = [
  'adventure_alex', 'wanderlust_sarah', 'backpack_ben', 'luxury_lisa',
  'culture_carlos', 'beach_bella', 'mountain_mike', 'foodie_fiona',
  'photo_paul', 'yoga_yuki',
]

// Chunk consecutive (by date) albums into journeys of this many legs. Within a
// chunk each album continues from the previous one; the first album of a chunk
// starts a new journey (no connection). A trailing leftover stays standalone.
const JOURNEY_SIZE = 3

async function main() {
  const { data: users, error: usersErr } = await sb
    .from('users')
    .select('id, username')
    .in('username', DEMO_USERNAMES)
  if (usersErr) throw usersErr
  if (!users?.length) {
    console.log('No demo users found — nothing to do.')
    return
  }

  let connected = 0
  let standalone = 0
  let connectedAccounts = 0
  let unconnectedAccounts = 0

  // Sort users by username for a stable, deterministic split.
  users.sort((a, b) => a.username.localeCompare(b.username))

  for (let u = 0; u < users.length; u++) {
    const user = users[u]
    // Located, published albums for this user, chronological order.
    const { data: albums, error: albErr } = await sb
      .from('albums')
      .select('id, title, date_start, created_at')
      .eq('user_id', user.id)
      .neq('status', 'draft')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('date_start', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (albErr) throw albErr
    if (!albums?.length) continue

    // Reset first (idempotency): drop any existing connections on these albums.
    await sb
      .from('albums')
      .update({ connected_from_album_id: null })
      .in('id', albums.map((a) => a.id))

    // Split accounts so the demo shows BOTH cases: even-indexed accounts get
    // their trips linked into journeys; odd-indexed accounts stay unconnected
    // (standalone pins, no arcs). With ~2 located albums each, this is the
    // clearest way to demonstrate connected vs not-connected side by side.
    const linkThisAccount = u % 2 === 0
    if (!linkThisAccount) {
      unconnectedAccounts++
      standalone += albums.length
      console.log(`  ${user.username}: ${albums.length} albums — left unconnected (standalone)`)
      continue
    }

    // Re-link into short journeys. First album of each chunk = journey start.
    let linked = 0
    for (let i = 0; i < albums.length; i++) {
      const startsNewJourney = i % JOURNEY_SIZE === 0
      if (startsNewJourney) {
        standalone++
        continue
      }
      const prev = albums[i - 1]
      const { error: upErr } = await sb
        .from('albums')
        .update({ connected_from_album_id: prev.id })
        .eq('id', albums[i].id)
      if (upErr) throw upErr
      connected++
      linked++
    }
    connectedAccounts++
    console.log(`  ${user.username}: ${albums.length} albums — ${linked} linked into a journey`)
  }

  console.log(
    `\nDone. ${connectedAccounts} accounts with connected journeys (${connected} arcs), ` +
      `${unconnectedAccounts} accounts left unconnected. ${standalone} albums are journey starts / standalone.`,
  )
}

main().catch((e) => {
  console.error('Failed:', e.message)
  process.exit(1)
})
