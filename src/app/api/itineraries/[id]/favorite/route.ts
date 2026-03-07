import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

// PATCH /api/itineraries/[id]/favorite - Toggle favorite status
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
    const body: { is_favorite: boolean } = await request.json()

    if (body.is_favorite === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: is_favorite' },
        { status: 400 }
      )
    }

    // Update favorite status
    const { data, error } = await supabase
      .from('itineraries')
      .update({ is_favorite: body.is_favorite })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, is_favorite')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Itinerary not found' },
          { status: 404 }
        )
      }
      log.error('Error toggling favorite', {
        component: 'ItinerariesAPI',
        action: 'toggle-favorite',
        userId: user.id,
        itineraryId: id
      }, error)
      throw error
    }

    log.info('Itinerary favorite toggled', {
      component: 'ItinerariesAPI',
      action: 'toggle-favorite',
      userId: user.id,
      itineraryId: id,
      isFavorite: body.is_favorite
    })

    return NextResponse.json({
      success: true,
      is_favorite: data.is_favorite
    })
  } catch (error) {
    log.error('Failed to toggle favorite', {
      component: 'ItinerariesAPI',
      action: 'toggle-favorite'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}
