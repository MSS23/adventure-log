import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateGlobeReactionRequest } from '@/types/database'
import { rateLimit, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'

/**
 * GET /api/globe-reactions
 * Fetch globe reactions for a user
 */
export async function GET(request: NextRequest) {
  // Rate limiting: 100 requests per 15 minutes
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.api, keyPrefix: 'globe-reactions-get' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const targetUserId = searchParams.get('targetUserId') || user.id
    const limit = parseInt(searchParams.get('limit') || '50')

    // Use the database function
    const { data, error } = await supabase.rpc('get_globe_reactions', {
      target_user_id_param: targetUserId,
      requesting_user_id_param: user.id,
      limit_param: limit
    })

    if (error) {
      console.error('Error fetching globe reactions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reactions: data || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/globe-reactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/globe-reactions
 * Create a new globe reaction
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 100 requests per 15 minutes
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.api, keyPrefix: 'globe-reactions-post' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateGlobeReactionRequest = await request.json()

    // Validate required fields
    if (!body.target_user_id || !body.reaction_type || !body.target_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create the reaction
    const { data, error } = await supabase
      .from('globe_reactions')
      .insert({
        user_id: user.id,
        ...body
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating globe reaction:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create reaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reaction: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/globe-reactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
