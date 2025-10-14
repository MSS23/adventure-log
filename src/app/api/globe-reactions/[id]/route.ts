import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateGlobeReactionRequest } from '@/types/database'

/**
 * PATCH /api/globe-reactions/[id]
 * Update a globe reaction (e.g., mark as read, update message)
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
    const body: UpdateGlobeReactionRequest = await request.json()

    // Update the reaction
    const { data, error } = await supabase
      .from('globe_reactions')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating globe reaction:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reaction: data })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/globe-reactions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/globe-reactions/[id]
 * Delete a globe reaction
 */
export async function DELETE(
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

    // Delete the reaction
    const { error } = await supabase
      .from('globe_reactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting globe reaction:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/globe-reactions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
