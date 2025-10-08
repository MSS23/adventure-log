/**
 * Playlist Items API Routes
 * Handles adding/removing items from playlists
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const playlistId = params.id

    const { data, error } = await supabase
      .from('playlist_items')
      .select(`
        *,
        album:albums(
          id,
          title,
          cover_photo_url,
          location_name,
          latitude,
          longitude,
          country_code
        )
      `)
      .eq('playlist_id', playlistId)
      .order('order_index', { ascending: true })

    if (error) throw error

    return NextResponse.json({ items: data })
  } catch (error) {
    console.error('Error fetching playlist items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch playlist items' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const playlistId = params.id
    const body = await request.json()

    // Get current item count
    const { count } = await supabase
      .from('playlist_items')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', playlistId)

    const { data: item, error } = await supabase
      .from('playlist_items')
      .insert({
        playlist_id: playlistId,
        album_id: body.album_id,
        custom_location_name: body.custom_location_name,
        custom_latitude: body.custom_latitude,
        custom_longitude: body.custom_longitude,
        custom_notes: body.custom_notes,
        notes: body.notes,
        added_by_user_id: user.id,
        order_index: count || 0
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error adding playlist item:', error)
    return NextResponse.json(
      { error: 'Failed to add item to playlist' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('playlist_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing playlist item:', error)
    return NextResponse.json(
      { error: 'Failed to remove item from playlist' },
      { status: 500 }
    )
  }
}

