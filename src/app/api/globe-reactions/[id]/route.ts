import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UpdateGlobeReactionRequest } from '@/types/database'
import { log } from '@/lib/utils/logger'

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

    // Verify ownership before updating
    const { data: existing } = await supabase
      .from('globe_reactions')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update the reaction
    const { data, error } = await supabase
      .from('globe_reactions')
      .update(body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      log.error('Error updating globe reaction', { component: 'GlobeReactions', action: 'update' }, error)
      return NextResponse.json(
        { error: 'Failed to update reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reaction: data })
  } catch (error) {
    log.error('Unexpected error in PATCH /api/globe-reactions/[id]', { component: 'GlobeReactions', action: 'update' }, error as Error)
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

    // Delete the reaction (only if owned by current user)
    const { error } = await supabase
      .from('globe_reactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      log.error('Error deleting globe reaction', { component: 'GlobeReactions', action: 'delete' }, error)
      return NextResponse.json(
        { error: 'Failed to delete reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Unexpected error in DELETE /api/globe-reactions/[id]', { component: 'GlobeReactions', action: 'delete' }, error as Error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
