import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'
import { sanitizeText } from '@/lib/utils/input-validation'

const CATEGORIES = ['see', 'eat', 'do', 'stay', 'other']

// PATCH /api/saved-places/[id] — update category, notes, or visited state
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (typeof body.category === 'string') {
      if (!CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
      updates.category = body.category
    }
    if ('notes' in body) {
      // Sanitize like the POST route does — PATCH must not be the unsanitized
      // side door for the same column.
      updates.notes = body.notes ? sanitizeText(String(body.notes)).slice(0, 2000) : null
    }
    if ('visited_at' in body) {
      if (body.visited_at) {
        const visited = new Date(body.visited_at)
        // Invalid dates throw RangeError in toISOString(), surfacing as an
        // opaque 500 — validate and answer 400 instead.
        if (Number.isNaN(visited.getTime())) {
          return NextResponse.json({ error: 'Invalid visited_at date' }, { status: 400 })
        }
        updates.visited_at = visited.toISOString()
      } else {
        updates.visited_at = null
      }
    }
    if (typeof body.place_name === 'string' && body.place_name.trim()) {
      updates.place_name = sanitizeText(body.place_name.trim()).slice(0, 200)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('saved_places')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Saved place not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ success: true, item: data })
  } catch (error) {
    log.error('Failed to update saved place', { component: 'SavedPlacesAPI', action: 'update' }, error as Error)
    return NextResponse.json({ error: 'Failed to update saved place' }, { status: 500 })
  }
}

// DELETE /api/saved-places/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to delete saved place', { component: 'SavedPlacesAPI', action: 'delete' }, error as Error)
    return NextResponse.json({ error: 'Failed to delete saved place' }, { status: 500 })
  }
}
