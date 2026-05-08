import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

// POST /api/wishlist/suggest - Suggest a destination to a travel partner
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { partner_id, location_name, country_code, latitude, longitude, notes } = body

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    if (!location_name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    if (latitude == null || longitude == null) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    if (partner_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot suggest a destination to yourself' },
        { status: 400 }
      )
    }

    // Verify mutual follow
    const { data: forward } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', partner_id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!forward) {
      return NextResponse.json(
        { error: 'You can only suggest destinations to mutual follows' },
        { status: 403 }
      )
    }

    const { data: reverse } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', partner_id)
      .eq('following_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!reverse) {
      return NextResponse.json(
        { error: 'You can only suggest destinations to mutual follows' },
        { status: 403 }
      )
    }

    // Use admin client to bypass RLS — we're inserting on behalf of the partner
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    // Create the wishlist item on the partner's list
    const { data, error } = await supabaseAdmin
      .from('wishlist_items')
      .insert({
        user_id: partner_id,
        location_name,
        country_code: country_code || null,
        latitude,
        longitude,
        notes: notes || null,
        priority: 'medium',
        source: 'shared',
        shared_by_user_id: user.id,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This destination is already on their wishlist' },
          { status: 409 }
        )
      }
      log.error('Error suggesting wishlist destination', {
        component: 'WishlistAPI',
        action: 'suggest',
        userId: user.id,
        partnerId: partner_id
      }, error)
      throw error
    }

    log.info('Wishlist destination suggested', {
      component: 'WishlistAPI',
      action: 'suggest',
      userId: user.id,
      partnerId: partner_id,
      itemId: data.id
    })

    return NextResponse.json({
      success: true,
      item: data
    }, { status: 201 })
  } catch (error) {
    log.error('Failed to suggest wishlist destination', {
      component: 'WishlistAPI',
      action: 'suggest'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to suggest destination' },
      { status: 500 }
    )
  }
}
