import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple in-route rate limiter for admin endpoints: 5 requests per 15 minutes per IP
const adminRateLimit = new Map<string, { count: number; resetAt: number }>()
const ADMIN_RATE_LIMIT = 5
const ADMIN_RATE_WINDOW = 15 * 60 * 1000

function checkAdminRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = adminRateLimit.get(ip)
  if (!record || now > record.resetAt) {
    adminRateLimit.set(ip, { count: 1, resetAt: now + ADMIN_RATE_WINDOW })
    return true
  }
  if (record.count >= ADMIN_RATE_LIMIT) return false
  record.count++
  return true
}

export async function POST(request: NextRequest) {
  // Rate limit admin endpoint
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') || 'unknown'
  if (!checkAdminRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Verify authorization - require service role key
  const authHeader = request.headers.get('authorization')
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const results: { name: string; status: string; error?: string }[] = []

  // Migration 15: Collaborative Albums
  try {
    // Check if table exists first
    const { error: checkErr } = await supabase
      .from('album_collaborators')
      .select('id')
      .limit(0)

    if (checkErr?.code === 'PGRST205' || checkErr?.code === '42P01') {
      // Table doesn't exist - but we can't CREATE TABLE via PostgREST
      results.push({ name: 'album_collaborators', status: 'needs_manual', error: 'Cannot create tables via REST API - run SQL in Supabase dashboard' })
    } else {
      results.push({ name: 'album_collaborators', status: 'exists' })
    }
  } catch {
    results.push({ name: 'album_collaborators', status: 'error' })
  }

  // Check each missing table
  const tables = ['wishlist_items', 'user_preferences', 'reactions', 'challenges', 'user_challenges']

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0)
      if (error?.code === 'PGRST205' || error?.code === '42P01') {
        results.push({ name: table, status: 'missing' })
      } else if (error) {
        results.push({ name: table, status: 'error', error: error.message })
      } else {
        results.push({ name: table, status: 'exists' })
      }
    } catch {
      results.push({ name: table, status: 'error' })
    }
  }

  // Check the view
  try {
    const { error } = await supabase.from('reactions_with_users').select('*').limit(0)
    if (error?.code === 'PGRST205') {
      results.push({ name: 'reactions_with_users (view)', status: 'missing' })
    } else {
      results.push({ name: 'reactions_with_users (view)', status: 'exists' })
    }
  } catch {
    results.push({ name: 'reactions_with_users (view)', status: 'error' })
  }

  const missing = results.filter(r => r.status === 'missing' || r.status === 'needs_manual')

  return NextResponse.json({
    results,
    summary: {
      total: results.length,
      existing: results.filter(r => r.status === 'exists').length,
      missing: missing.length,
    },
    action: missing.length > 0
      ? 'Run these SQL files in the Supabase SQL Editor (Dashboard > SQL Editor): supabase/migrations/15_collaborative_albums.sql and supabase/migrations/16_missing_tables.sql'
      : 'All tables exist! No action needed.',
  })
}
