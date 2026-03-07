import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitAsync, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { log } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

/**
 * GET /api/messages/[conversationId]
 * Fetch messages in a conversation with cursor-based pagination.
 *
 * Query params:
 * - cursor: ISO date string for pagination (fetch messages before this time)
 * - limit: number of messages to fetch (default 50, max 100)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.api, keyPrefix: 'messages-get' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await context.params

    // Verify the user is a participant in this conversation
    const { data: participant, error: partError } = await supabase
      .from('conversation_participants')
      .select('id, last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (partError || !participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Build query for messages
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit + 1) // Fetch one extra to determine if there are more

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: messages, error: msgError } = await query

    if (msgError) {
      log.error('Error fetching messages', { component: 'Messages', action: 'getMessages', conversationId }, msgError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    const hasMore = (messages || []).length > limit
    const result = (messages || []).slice(0, limit)

    // Fetch sender profiles for all messages
    const senderIds = [...new Set(result.map((m) => m.sender_id))]
    let senderProfiles: Record<string, { id: string; username: string; display_name: string; avatar_url: string | null }> = {}

    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', senderIds)

      if (profiles) {
        senderProfiles = Object.fromEntries(profiles.map((p) => [p.id, p]))
      }
    }

    // Attach sender info to messages
    const enrichedMessages = result.map((msg) => ({
      ...msg,
      sender: senderProfiles[msg.sender_id] || null,
    }))

    // Update last_read_at for the current user
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    return NextResponse.json({
      messages: enrichedMessages,
      has_more: hasMore,
      next_cursor: hasMore && result.length > 0 ? result[result.length - 1].created_at : null,
    })
  } catch (error) {
    log.error('Unexpected error in GET /api/messages/[conversationId]', { component: 'Messages', action: 'getMessages' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/messages/[conversationId]
 * Send a message in a conversation.
 *
 * Body: { content: string, message_type?: string, reply_to_id?: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const rateLimitResult = await rateLimitAsync(request, { ...rateLimitConfigs.messages, keyPrefix: 'messages-send' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await context.params

    // Verify the user is a participant
    const { data: participant, error: partError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (partError || !participant) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const body = await request.json()
    const { content, message_type = 'text', reply_to_id } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 })
    }

    // Create the message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        message_type,
        reply_to_id: reply_to_id || null,
        is_edited: false,
        is_deleted: false,
      })
      .select()
      .single()

    if (msgError || !message) {
      log.error('Error sending message', { component: 'Messages', action: 'sendMessage', conversationId }, msgError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: message.created_at })
      .eq('id', conversationId)

    // Update sender's last_read_at
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: message.created_at })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)

    // Get sender profile for the response
    const { data: senderProfile } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', user.id)
      .single()

    return NextResponse.json(
      { message: { ...message, sender: senderProfile } },
      { status: 201 }
    )
  } catch (error) {
    log.error('Unexpected error in POST /api/messages/[conversationId]', { component: 'Messages', action: 'sendMessage' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
