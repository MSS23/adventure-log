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
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
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
    if (body.location_name !== undefined) {
      const name = String(body.location_name).trim().slice(0, 200)
      if (!name) {
        return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
      }
      updates.location_name = name
    }
    if (body.country_code !== undefined) updates.country_code = body.country_code
    if (body.latitude !== undefined) {
      const lat = Number(body.latitude)
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 })
      }
      updates.latitude = lat
    }
    if (body.longitude !== undefined) {
      const lng = Number(body.longitude)
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 })
      }
      updates.longitude = lng
    }
    if (body.checklist !== undefined) {
      if (!Array.isArray(body.checklist)) {
        return NextResponse.json({ error: 'Checklist must be an array' }, { status: 400 })
      }
      // Normalize each row: keep a stable id, plain-text label (≤200 chars),
      // and a boolean done flag. Drop blanks; cap the list to keep rows sane.
      const checklist = body.checklist
        .slice(0, 50)
        .map((raw: unknown) => {
          const row = (raw ?? {}) as Record<string, unknown>
          const text = String(row.text ?? '').trim().slice(0, 200)
          if (!text) return null
          const id =
            typeof row.id === 'string' && row.id ? row.id : crypto.randomUUID()
          return { id, text, done: Boolean(row.done) }
        })
        .filter(Boolean)
      updates.checklist = checklist
    }

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
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'That destination is already on your wishlist' },
          { status: 409 }
        )
      }
      log.error('Error updating wishlist item', {
        component: 'WishlistAPI',
        action: 'update',
        userId,
        itemId: id
      }, error)
      throw error
    }

    log.info('Wishlist item updated', {
      component: 'WishlistAPI',
      action: 'update',
      userId,
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
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      log.error('Error deleting wishlist item', {
        component: 'WishlistAPI',
        action: 'delete',
        userId,
        itemId: id
      }, error)
      throw error
    }

    log.info('Wishlist item deleted', {
      component: 'WishlistAPI',
      action: 'delete',
      userId,
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
