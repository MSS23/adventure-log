import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

// GET /api/check-ins - Fetch check-ins
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = searchParams.get('user_id') || user.id
    const country = searchParams.get('country')
    const mood = searchParams.get('mood')

    let query = supabase
      .from('check_ins')
      .select('*, users:user_id(id, username, display_name, avatar_url)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (country) {
      query = query.eq('country_code', country)
    }

    if (mood) {
      query = query.eq('mood', mood)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      log.error('Error fetching check-ins', {
        component: 'CheckInsAPI',
        action: 'fetch',
        userId: user.id
      }, error)
      throw error
    }

    return NextResponse.json({
      check_ins: data || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    })
  } catch (error) {
    log.error('Failed to fetch check-ins', {
      component: 'CheckInsAPI',
      action: 'fetch'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch check-ins' },
      { status: 500 }
    )
  }
}

// POST /api/check-ins - Create new check-in
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.location_name || body.latitude === undefined || body.longitude === undefined) {
      return NextResponse.json(
        { error: 'Location name, latitude, and longitude are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: user.id,
        location_name: body.location_name,
        location_address: body.location_address || null,
        latitude: body.latitude,
        longitude: body.longitude,
        country_code: body.country_code || null,
        note: body.note || null,
        mood: body.mood || null,
        photo_url: body.photo_url || null,
        visibility: body.visibility || 'public',
        album_id: body.album_id || null,
        like_count: 0,
      })
      .select('*, users:user_id(id, username, display_name, avatar_url)')
      .single()

    if (error) {
      log.error('Error creating check-in', {
        component: 'CheckInsAPI',
        action: 'create',
        userId: user.id
      }, error)
      throw error
    }

    log.info('Check-in created', {
      component: 'CheckInsAPI',
      action: 'create',
      userId: user.id,
      checkInId: data.id,
      location: body.location_name
    })

    return NextResponse.json({
      success: true,
      check_in: data
    }, { status: 201 })
  } catch (error) {
    log.error('Failed to create check-in', {
      component: 'CheckInsAPI',
      action: 'create'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to create check-in' },
      { status: 500 }
    )
  }
}

// DELETE /api/check-ins - Delete a check-in (by id in query param)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Check-in ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('check_ins')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      log.error('Error deleting check-in', {
        component: 'CheckInsAPI',
        action: 'delete',
        userId: user.id,
        checkInId: id
      }, error)
      throw error
    }

    log.info('Check-in deleted', {
      component: 'CheckInsAPI',
      action: 'delete',
      userId: user.id,
      checkInId: id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to delete check-in', {
      component: 'CheckInsAPI',
      action: 'delete'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to delete check-in' },
      { status: 500 }
    )
  }
}
