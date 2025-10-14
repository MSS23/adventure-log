import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/albums/[id]/cover-position
 * Update the cover photo positioning for an album
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const { position, xOffset, yOffset } = body

    if (!position || xOffset === undefined || yOffset === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: position, xOffset, yOffset' },
        { status: 400 }
      )
    }

    // Verify user owns this album
    const { data: album, error: fetchError } = await supabase
      .from('albums')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    }

    if (album.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update cover photo position
    const { error: updateError } = await supabase
      .from('albums')
      .update({
        cover_photo_position: position,
        cover_photo_x_offset: xOffset,
        cover_photo_y_offset: yOffset,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating cover position:', updateError)
      return NextResponse.json(
        { error: 'Failed to update cover position' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cover photo position updated successfully'
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/albums/[id]/cover-position:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
