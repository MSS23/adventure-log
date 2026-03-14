import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

// PATCH /api/wishlist/[id] - Update a wishlist item
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

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Build update object with only allowed fields
    const updates: Record<string, unknown> = {}

    if (body.notes !== undefined) updates.notes = body.notes
    if (body.priority !== undefined) {
      if (!['low', 'medium', 'high'].includes(body.priority)) {
        return NextResponse.json(
          { error: 'Priority must be low, medium, or high' },
          { status: 400 }
        )
      }
      updates.priority = body.priority
    }
    if (body.completed_at !== undefined) updates.completed_at = body.completed_at
    if (body.location_name !== undefined) updates.location_name = body.location_name
    if (body.country_code !== undefined) updates.country_code = body.country_code

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, shared_by:shared_by_user_id(id, username, display_name)')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 })
      }
      log.error('Error updating wishlist item', {
        component: 'WishlistAPI',
        action: 'update',
        userId: user.id,
        itemId: id
      }, error)
      throw error
    }

    log.info('Wishlist item updated', {
      component: 'WishlistAPI',
      action: 'update',
      userId: user.id,
      itemId: id
    })

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    log.error('Failed to update wishlist item', {
      component: 'WishlistAPI',
      action: 'update'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to update wishlist item' },
      { status: 500 }
    )
  }
}

// DELETE /api/wishlist/[id] - Delete a wishlist item
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

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      log.error('Error deleting wishlist item', {
        component: 'WishlistAPI',
        action: 'delete',
        userId: user.id,
        itemId: id
      }, error)
      throw error
    }

    log.info('Wishlist item deleted', {
      component: 'WishlistAPI',
      action: 'delete',
      userId: user.id,
      itemId: id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to delete wishlist item', {
      component: 'WishlistAPI',
      action: 'delete'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to delete wishlist item' },
      { status: 500 }
    )
  }
}
