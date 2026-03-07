#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testSearchIssues() {
  console.log('Testing search issues...\n')

  // Test 1: Check if the specific album exists
  console.log('1. Checking if album "T album title Test Update and Italy" exists:')
  const { data: albums, error: albumError } = await supabase
    .from('albums')
    .select('id, title, description, location_name, country_code, visibility, status, user_id')
    .ilike('title', '%T album title Test Update and Italy%')

  if (albumError) {
    console.error('Error searching albums:', albumError)
  } else {
    console.log('Found albums:', albums)
  }

  // Test 2: Search for albums with partial match
  console.log('\n2. Testing partial match for "Italy":')
  const { data: italyAlbums, error: italyError } = await supabase
    .from('albums')
    .select('id, title, location_name, visibility, status')
    .or('title.ilike.%Italy%,location_name.ilike.%Italy%')
    .neq('status', 'draft')
    .limit(5)

  if (italyError) {
    console.error('Error:', italyError)
  } else {
    console.log('Albums with "Italy":', italyAlbums?.map(a => ({ title: a.title, location: a.location_name, visibility: a.visibility })))
  }

  // Test 3: Check user search
  console.log('\n3. Testing user search:')
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, username, display_name')
    .limit(5)

  if (userError) {
    console.error('Error:', userError)
  } else {
    console.log('Sample users:', users?.map(u => ({ username: u.username, display_name: u.display_name })))
  }

  // Test 4: Check albums with missing user relations
  console.log('\n4. Checking albums with user relations:')
  const { data: albumsWithUsers, error: relError } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      user_id,
      users!inner(id, username, display_name)
    `)
    .neq('status', 'draft')
    .limit(5)

  if (relError) {
    console.error('Error:', relError)
  } else {
    console.log('Albums with users:', albumsWithUsers?.map(a => ({
      title: a.title,
      user: a.users?.username || 'NO USER DATA'
    })))
  }

  // Test 5: Full search query as in component
  console.log('\n5. Testing exact search query from component for "Italy":')
  const searchTerm = 'Italy'
  const { data: searchResults, error: searchError } = await supabase
    .from('albums')
    .select(`
      id,
      title,
      description,
      created_at,
      date_start,
      location_name,
      country_code,
      latitude,
      longitude,
      cover_photo_url,
      visibility,
      status,
      user_id,
      users!inner(id, username, display_name)
    `)
    .neq('status', 'draft')
    .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,location_name.ilike.%${searchTerm}%`)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(10)

  if (searchError) {
    console.error('Search error:', searchError)
  } else {
    console.log('Search results for "Italy":', searchResults?.length, 'albums found')
    searchResults?.forEach(album => {
      console.log(`  - "${album.title}" by @${album.users?.username} (${album.visibility}, ${album.status})`)
    })
  }
}

testSearchIssues().catch(console.error)