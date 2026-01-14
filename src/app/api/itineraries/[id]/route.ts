import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { UpdateItineraryRequest } from '@/types/database'
import { log } from '@/lib/utils/logger'

// GET /api/itineraries/[id] - Fetch single itinerary
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Fetch itinerary
    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Itinerary not found' },
          { status: 404 }
        )
      }
      log.error('Error fetching itinerary', {
        component: 'ItinerariesAPI',
        action: 'fetch-single',
        userId: user.id,
        itineraryId: id
      }, error)
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    log.error('Failed to fetch itinerary', {
      component: 'ItinerariesAPI',
      action: 'fetch-single'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch itinerary' },
      { status: 500 }
    )
  }
}

// PATCH /api/itineraries/[id] - Update itinerary
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body: Partial<UpdateItineraryRequest> = await request.json()

    // Build update object (only include provided fields)
    const updates: Partial<UpdateItineraryRequest> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.date_start !== undefined) updates.date_start = body.date_start
    if (body.date_end !== undefined) updates.date_end = body.date_end
    if (body.is_favorite !== undefined) updates.is_favorite = body.is_favorite
    if (body.status !== undefined) updates.status = body.status
    if (body.related_album_ids !== undefined) updates.related_album_ids = body.related_album_ids

    // Perform update
    const { data, error } = await supabase
      .from('itineraries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Itinerary not found' },
          { status: 404 }
        )
      }
      log.error('Error updating itinerary', {
        component: 'ItinerariesAPI',
        action: 'update',
        userId: user.id,
        itineraryId: id
      }, error)
      throw error
    }

    log.info('Itinerary updated', {
      component: 'ItinerariesAPI',
      action: 'update',
      userId: user.id,
      itineraryId: id
    })

    return NextResponse.json({
      success: true,
      itinerary: data
    })
  } catch (error) {
    log.error('Failed to update itinerary', {
      component: 'ItinerariesAPI',
      action: 'update'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to update itinerary' },
      { status: 500 }
    )
  }
}

// DELETE /api/itineraries/[id] - Delete itinerary
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Delete itinerary
    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      log.error('Error deleting itinerary', {
        component: 'ItinerariesAPI',
        action: 'delete',
        userId: user.id,
        itineraryId: id
      }, error)
      throw error
    }

    log.info('Itinerary deleted', {
      component: 'ItinerariesAPI',
      action: 'delete',
      userId: user.id,
      itineraryId: id
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    log.error('Failed to delete itinerary', {
      component: 'ItinerariesAPI',
      action: 'delete'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to delete itinerary' },
      { status: 500 }
    )
  }
}
