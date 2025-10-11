/**
 * Playlists API Routes
 * Handles CRUD operations for playlists
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    console.error('Error fetching playlists:', error)
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

    const { data: playlist, error } = await supabase
      .from('playlists')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description,
        playlist_type: body.playlist_type || 'curated',
        category: body.category,
        tags: body.tags,
        visibility: body.visibility || 'public',
        is_collaborative: body.is_collaborative || false,
        allow_subscriptions: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error('Error creating playlist:', error)
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    )
  }
}

