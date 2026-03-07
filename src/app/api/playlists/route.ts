/**
 * Playlists API Routes
 * Handles CRUD operations for playlists
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'
import { sanitizeText } from '@/lib/utils/input-validation'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // 'my', 'subscribed', 'discover'
    const category = searchParams.get('category')

    if (type === 'discover') {
      // Public playlists for discovery
      let query = supabase
        .from('playlists')
        .select(`
          *,
          user:users!playlists_user_id_fkey(
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('visibility', 'public')
        .eq('allow_subscriptions', true)
        .order('subscriber_count', { ascending: false })
        .limit(20)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error

      return NextResponse.json({ playlists: data })
    }

    // User's playlists using RPC function
    const { data, error } = await supabase
      .rpc('get_user_playlists', { user_id_param: user.id })

    if (error) throw error

    return NextResponse.json({ playlists: data })
  } catch (error) {
    log.error('Error fetching playlists', { component: 'Playlists', action: 'fetch' }, error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (body.title.length > 100) {
      return NextResponse.json({ error: 'Title must be under 100 characters' }, { status: 400 })
    }

    const allowedVisibilities = ['public', 'private', 'friends']
    const visibility = allowedVisibilities.includes(body.visibility) ? body.visibility : 'public'

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        title: sanitizeText(body.title.trim()),
        description: body.description ? sanitizeText(body.description.slice(0, 500)) : null,
        playlist_type: body.playlist_type || 'curated',
        category: body.category ? sanitizeText(body.category.slice(0, 50)) : null,
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 20).map((t: string) => sanitizeText(String(t).slice(0, 30))) : null,
        visibility,
        is_collaborative: body.is_collaborative === true,
        allow_subscriptions: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ playlist })
  } catch (error) {
    log.error('Error creating playlist', { component: 'Playlists', action: 'create' }, error as Error)
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    )
  }
}

