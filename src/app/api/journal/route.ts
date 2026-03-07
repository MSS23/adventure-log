import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}

// GET /api/journal - Fetch user's journal entries
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'all'
    const tag = searchParams.get('tag')

    let query = supabase
      .from('journal_entries')
      .select('*, users:user_id(id, username, display_name, avatar_url)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      log.error('Error fetching journal entries', {
        component: 'JournalAPI',
        action: 'fetch',
        userId: user.id
      }, error)
      throw error
    }

    return NextResponse.json({
      entries: data || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    })
  } catch (error) {
    log.error('Failed to fetch journal entries', {
      component: 'JournalAPI',
      action: 'fetch'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    )
  }
}

// POST /api/journal - Create new journal entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const content = body.content || ''
    const readingTime = calculateReadingTime(content)

    // Generate excerpt from content if not provided
    const excerpt = body.excerpt || content
      .replace(/[#*_~`>\-\[\]()!]/g, '')
      .substring(0, 200)
      .trim() + (content.length > 200 ? '...' : '')

    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: user.id,
        title: body.title,
        content,
        excerpt,
        cover_image_url: body.cover_image_url || null,
        location_name: body.location_name || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        country_code: body.country_code || null,
        album_id: body.album_id || null,
        tags: body.tags || [],
        status: body.status || 'draft',
        visibility: body.visibility || 'public',
        reading_time_minutes: readingTime,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        published_at: body.status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      log.error('Error creating journal entry', {
        component: 'JournalAPI',
        action: 'create',
        userId: user.id
      }, error)
      throw error
    }

    log.info('Journal entry created', {
      component: 'JournalAPI',
      action: 'create',
      userId: user.id,
      entryId: data.id
    })

    return NextResponse.json({
      success: true,
      entry: data
    }, { status: 201 })
  } catch (error) {
    log.error('Failed to create journal entry', {
      component: 'JournalAPI',
      action: 'create'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    )
  }
}
