import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

// GET /api/journal/[id] - Fetch single journal entry
export async function GET(
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

    // Fetch the entry with user info
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, users:user_id(id, username, display_name, avatar_url, bio)')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
      }
      log.error('Error fetching journal entry', {
        component: 'JournalAPI',
        action: 'fetch-single',
        userId: user.id,
        entryId: id
      }, error)
      throw error
    }

    // Only allow owner to view drafts
    if (data.status === 'draft' && data.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Increment view count if viewer is not the author
    if (data.user_id !== user.id) {
      await supabase
        .from('journal_entries')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id)
    }

    return NextResponse.json({ entry: data })
  } catch (error) {
    log.error('Failed to fetch journal entry', {
      component: 'JournalAPI',
      action: 'fetch-single'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entry' },
      { status: 500 }
    )
  }
}

// PATCH /api/journal/[id] - Update journal entry
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
    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.content !== undefined) {
      updates.content = body.content
      updates.reading_time_minutes = calculateReadingTime(body.content)
      // Regenerate excerpt if content changes and excerpt not explicitly set
      if (body.excerpt === undefined) {
        updates.excerpt = body.content
          .replace(/[#*_~`>\-\[\]()!]/g, '')
          .substring(0, 200)
          .trim() + (body.content.length > 200 ? '...' : '')
      }
    }
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url
    if (body.location_name !== undefined) updates.location_name = body.location_name
    if (body.latitude !== undefined) updates.latitude = body.latitude
    if (body.longitude !== undefined) updates.longitude = body.longitude
    if (body.country_code !== undefined) updates.country_code = body.country_code
    if (body.album_id !== undefined) updates.album_id = body.album_id
    if (body.tags !== undefined) updates.tags = body.tags
    if (body.visibility !== undefined) updates.visibility = body.visibility
    if (body.status !== undefined) {
      updates.status = body.status
      // Set published_at when first publishing
      if (body.status === 'published') {
        updates.published_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
      }
      log.error('Error updating journal entry', {
        component: 'JournalAPI',
        action: 'update',
        userId: user.id,
        entryId: id
      }, error)
      throw error
    }

    log.info('Journal entry updated', {
      component: 'JournalAPI',
      action: 'update',
      userId: user.id,
      entryId: id
    })

    return NextResponse.json({ success: true, entry: data })
  } catch (error) {
    log.error('Failed to update journal entry', {
      component: 'JournalAPI',
      action: 'update'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to update journal entry' },
      { status: 500 }
    )
  }
}

// DELETE /api/journal/[id] - Delete journal entry
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
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      log.error('Error deleting journal entry', {
        component: 'JournalAPI',
        action: 'delete',
        userId: user.id,
        entryId: id
      }, error)
      throw error
    }

    log.info('Journal entry deleted', {
      component: 'JournalAPI',
      action: 'delete',
      userId: user.id,
      entryId: id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error('Failed to delete journal entry', {
      component: 'JournalAPI',
      action: 'delete'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to delete journal entry' },
      { status: 500 }
    )
  }
}
