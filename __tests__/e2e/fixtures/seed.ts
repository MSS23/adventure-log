/**
 * E2E fixture seeding — shared by global-setup/teardown.
 *
 * Creates two REAL confirmed users via the Supabase service role and seeds
 * the exact data shapes the journey specs assert against:
 *
 *   e2e_main   — London album dated 2025 + Paris album dated 2026 (the
 *                cross-year shape behind the "Wrapped won't fly" bug),
 *                one wishlist item, public profile.
 *   e2e_friend — public profile, one public album, one place
 *                recommendation in Greece ("friends recommend" map layer),
 *                mutual accepted follow with e2e_main (Travel Blend works).
 *
 * Everything is keyed to @adventurelog.test emails so a crashed run can be
 * cleaned up by re-running setup (it deletes any existing fixture users
 * first). Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY —
 * when absent (e.g. CI without secrets), seeding is skipped and specs that
 * need the fixture skip themselves.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

export const FIXTURE_STATE_PATH = path.join(__dirname, '.fixture-state.json')

// Saved browser auth states, written by auth.setup.ts and consumed by the
// journey specs (test files can't import each other, so they live here).
export const MAIN_STORAGE_STATE = path.join(__dirname, '.auth-main.json')
export const FRIEND_STORAGE_STATE = path.join(__dirname, '.auth-friend.json')

export const FIXTURE_PASSWORD = 'E2eFixture!23456'
export const MAIN_EMAIL = 'e2e-main@adventurelog.test'
export const FRIEND_EMAIL = 'e2e-friend@adventurelog.test'
export const MAIN_USERNAME = 'e2e_main'
export const FRIEND_USERNAME = 'e2e_friend'

export interface FixtureState {
  mainUserId: string
  friendUserId: string
  mainEmail: string
  friendEmail: string
  password: string
  mainUsername: string
  friendUsername: string
}

export function readFixtureState(): FixtureState | null {
  try {
    return JSON.parse(fs.readFileSync(FIXTURE_STATE_PATH, 'utf8')) as FixtureState
  } catch {
    return null
  }
}

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function deleteUserByEmail(admin: SupabaseClient, email: string) {
  // listUsers has no email filter pre v2 GoTrue admin — page through (fixture
  // projects are small; one page is plenty).
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = data?.users?.find((u) => u.email === email)
  if (existing) {
    await admin.auth.admin.deleteUser(existing.id)
  }
}

async function createConfirmedUser(
  admin: SupabaseClient,
  email: string,
  username: string,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: username },
  })
  if (error || !data.user) throw error ?? new Error(`createUser failed for ${email}`)
  const id = data.user.id

  // The signup trigger creates the profile row; force the fields the specs
  // rely on (stable username, public privacy). Upsert covers a missing row.
  const { error: profileError } = await admin.from('users').upsert(
    {
      id,
      username,
      display_name: username,
      privacy_level: 'public',
    },
    { onConflict: 'id' },
  )
  if (profileError) throw profileError
  return id
}

export async function seedFixture(): Promise<FixtureState | null> {
  const admin = adminClient()
  if (!admin) return null

  // Idempotency: nuke any leftovers from a crashed run (auth delete cascades
  // through albums/photos/follows/wishlist/recommendations).
  await deleteUserByEmail(admin, MAIN_EMAIL)
  await deleteUserByEmail(admin, FRIEND_EMAIL)

  const mainUserId = await createConfirmedUser(admin, MAIN_EMAIL, MAIN_USERNAME)
  const friendUserId = await createConfirmedUser(admin, FRIEND_EMAIL, FRIEND_USERNAME)

  // Albums — the cross-year pair that regression-tests the Wrapped fix.
  const { data: albums, error: albumsError } = await admin
    .from('albums')
    .insert([
      {
        user_id: mainUserId,
        title: 'London, Spring 2025',
        location_name: 'London, United Kingdom',
        country_code: 'GB',
        latitude: 51.5074,
        longitude: -0.1278,
        date_start: '2025-03-01',
        visibility: 'public',
        status: 'published',
      },
      {
        user_id: mainUserId,
        title: 'Paris, July 2026',
        location_name: 'Paris, France',
        country_code: 'FR',
        latitude: 48.8566,
        longitude: 2.3522,
        date_start: '2026-07-09',
        visibility: 'public',
        status: 'published',
      },
      {
        user_id: friendUserId,
        title: 'Athens Weekend',
        location_name: 'Athens, Greece',
        country_code: 'GR',
        latitude: 37.9838,
        longitude: 23.7275,
        date_start: '2026-05-10',
        visibility: 'public',
        status: 'published',
      },
    ])
    .select('id, user_id')
  if (albumsError) throw albumsError

  // One photo row per album — Wrapped and the feed drop photo-less albums.
  // file_path points at a placeholder object; specs never render the bytes.
  const { error: photosError } = await admin.from('photos').insert(
    (albums || []).map((a, i) => ({
      album_id: a.id,
      user_id: a.user_id,
      file_path: `${a.user_id}/${a.id}/e2e-placeholder-${i}.jpg`,
      order_index: 0,
    })),
  )
  if (photosError) throw photosError

  // Mutual accepted follow — makes the friend layers + Travel Blend real.
  const { error: followsError } = await admin.from('follows').insert([
    { follower_id: mainUserId, following_id: friendUserId, status: 'accepted' },
    { follower_id: friendUserId, following_id: mainUserId, status: 'accepted' },
  ])
  if (followsError) throw followsError

  // Friend's recommendation in Greece — the "friends recommend" map layer.
  const { error: recError } = await admin.from('place_recommendations').insert({
    created_by: friendUserId,
    title: 'Sunset at the Acropolis',
    place_type: 'visit',
    tip: 'Go an hour before close — golden light, no crowds.',
    city: 'Athens',
    country_code: 'GR',
    latitude: 37.9715,
    longitude: 23.7267,
  })
  if (recError) throw recError

  // A wishlist entry for the main user (wishlist map layer + wishlist page).
  const { error: wishlistError } = await admin.from('wishlist_items').insert({
    user_id: mainUserId,
    location_name: 'Kyoto, Japan',
    country_code: 'JP',
    latitude: 35.0116,
    longitude: 135.7681,
    priority: 'high',
    source: 'manual',
  })
  if (wishlistError) throw wishlistError

  const state: FixtureState = {
    mainUserId,
    friendUserId,
    mainEmail: MAIN_EMAIL,
    friendEmail: FRIEND_EMAIL,
    password: FIXTURE_PASSWORD,
    mainUsername: MAIN_USERNAME,
    friendUsername: FRIEND_USERNAME,
  }
  fs.writeFileSync(FIXTURE_STATE_PATH, JSON.stringify(state, null, 2))
  return state
}

export async function teardownFixture(): Promise<void> {
  const admin = adminClient()
  if (!admin) return
  await deleteUserByEmail(admin, MAIN_EMAIL)
  await deleteUserByEmail(admin, FRIEND_EMAIL)
  for (const file of [FIXTURE_STATE_PATH, MAIN_STORAGE_STATE, FRIEND_STORAGE_STATE]) {
    try {
      fs.unlinkSync(file)
    } catch {
      /* already gone */
    }
  }
}
