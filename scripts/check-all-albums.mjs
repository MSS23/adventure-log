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

async function checkAllAlbums() {
  console.log('Fetching all albums...\n')

  const { data: albums, error } = await supabase
    .from('albums')
    .select('id, title, location_name, country_code, visibility, status, user_id')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Total albums: ${albums.length}\n`)

  // Check for the specific album
  const targetAlbum = albums.find(a =>
    a.title?.toLowerCase().includes('t album title test update and italy') ||
    a.title?.toLowerCase().includes('test update') ||
    a.title?.toLowerCase().includes('album title')
  )

  if (targetAlbum) {
    console.log('Found target album:')
    console.log(targetAlbum)
  } else {
    console.log('Target album "T album title Test Update and Italy" not found')
    console.log('\nAlbums with "test" in title:')
    albums.filter(a => a.title?.toLowerCase().includes('test')).forEach(a => {
      console.log(`  - "${a.title}" (${a.visibility}, ${a.status})`)
    })
  }

  console.log('\nAll album titles:')
  albums.forEach(a => {
    console.log(`  - "${a.title}" (${a.visibility}, ${a.status})`)
  })
}

checkAllAlbums().catch(console.error)