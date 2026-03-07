import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CreateItineraryRequest, Itinerary } from '@/types/database'
import { log } from '@/lib/utils/logger'

// GET /api/itineraries - Fetch user's itineraries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'all' // all, draft, published, archived, favorites

    // Build query
    let query = supabase
      .from('itineraries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (status === 'favorites') {
      query = query.eq('is_favorite', true)
    } else if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      log.error('Error fetching itineraries', {
        component: 'ItinerariesAPI',
        action: 'fetch',
        userId: user.id
      }, error)
      throw error
    }

    return NextResponse.json({
      itineraries: data || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    })
  } catch (error) {
    log.error('Failed to fetch itineraries', {
      component: 'ItinerariesAPI',
      action: 'fetch'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch itineraries' },
      { status: 500 }
    )
  }
}

// POST /api/itineraries - Create new itinerary
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body: CreateItineraryRequest = await request.json()

    // Validate required fields
    if (!body.title || !body.country || !body.region || !body.itinerary_content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, country, region, itinerary_content' },
        { status: 400 }
      )
    }

    // Create itinerary
    const { data, error } = await supabase
      .from('itineraries')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description,
        country: body.country,
        region: body.region,
        date_start: body.date_start,
        date_end: body.date_end,
        travel_style: body.travel_style,
        budget: body.budget,
        additional_details: body.additional_details,
        itinerary_content: body.itinerary_content,
        related_album_ids: body.related_album_ids,
        cache_key: body.cache_key,
        ai_generated: true,
        status: 'draft'
      })
      .select()
      .single()

    if (error) {
      log.error('Error creating itinerary', {
        component: 'ItinerariesAPI',
        action: 'create',
        userId: user.id
      }, error)
      throw error
    }

    log.info('Itinerary created', {
      component: 'ItinerariesAPI',
      action: 'create',
      userId: user.id,
      itineraryId: data.id
    })

    return NextResponse.json({
      success: true,
      id: data.id,
      itinerary: data
    }, { status: 201 })
  } catch (error) {
    log.error('Failed to create itinerary', {
      component: 'ItinerariesAPI',
      action: 'create'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to create itinerary' },
      { status: 500 }
    )
  }
}
