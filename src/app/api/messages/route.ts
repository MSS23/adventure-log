import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse, rateLimitConfigs } from '@/lib/utils/rate-limit'
import { sanitizeText } from '@/lib/utils/input-validation'
import { log } from '@/lib/utils/logger'

/**
 * GET /api/messages
 * Fetch all conversations for the authenticated user, ordered by last message time.
 * Includes the other participant's profile info and the last message preview.
 */
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.api, keyPrefix: 'messages-list' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch conversations the user participates in
    const { data: participantRows, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (partError) {
      log.error('Error fetching participant rows', { component: 'Messages', action: 'listConversations' }, partError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    if (!participantRows || participantRows.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const conversationIds = participantRows.map((r) => r.conversation_id)

    // Fetch full conversation data
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false })

    if (convError) {
      log.error('Error fetching conversations', { component: 'Messages', action: 'listConversations' }, convError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    // Batch-fetch all participants, last messages, and profiles to avoid N+1 queries
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, last_read_at, is_muted, role')
      .in('conversation_id', conversationIds)

    // Collect other user IDs and fetch profiles in one query
    const otherUserIds = new Set<string>()
    const participantsByConv = new Map<string, typeof allParticipants>()
    for (const p of allParticipants || []) {
      if (!participantsByConv.has(p.conversation_id)) {
        participantsByConv.set(p.conversation_id, [])
      }
      participantsByConv.get(p.conversation_id)!.push(p)
      if (p.user_id !== user.id) {
        otherUserIds.add(p.user_id)
      }
    }

    const { data: userProfiles } = otherUserIds.size > 0
      ? await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', Array.from(otherUserIds))
      : { data: [] as { id: string; username: string; display_name: string; avatar_url: string }[] }

    const profileMap = new Map((userProfiles || []).map((u) => [u.id, u]))

    // Batch-fetch last messages for all conversations
    // We fetch the most recent non-deleted message per conversation
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, message_type, created_at')
      .in('conversation_id', conversationIds)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    // Group by conversation, take only the first (most recent) per conversation
    const lastMessageMap = new Map<string, typeof recentMessages extends (infer T)[] | null ? T : never>()
    for (const msg of recentMessages || []) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg)
      }
    }

    // Build enriched conversations
    const enriched = (conversations || []).map((conv) => {
      const participants = participantsByConv.get(conv.id) || []
      const myParticipant = participants.find((p) => p.user_id === user.id)
      const otherParticipant = participants.find((p) => p.user_id !== user.id)
      const otherUser = otherParticipant ? profileMap.get(otherParticipant.user_id) || null : null
      const lastMessage = lastMessageMap.get(conv.id) || null

      // Count unread: messages after last_read_at from other users
      const lastReadAt = myParticipant?.last_read_at || conv.created_at
      const unreadCount = (recentMessages || []).filter(
        (m) => m.conversation_id === conv.id &&
               m.sender_id !== user.id &&
               new Date(m.created_at) > new Date(lastReadAt)
      ).length

      return {
        ...conv,
        other_user: otherUser,
        last_message: lastMessage,
        unread_count: unreadCount,
        is_muted: myParticipant?.is_muted || false,
      }
    })

    return NextResponse.json({ conversations: enriched })
  } catch (error) {
    log.error('Unexpected error in GET /api/messages', { component: 'Messages', action: 'listConversations' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/messages
 * Create a new conversation (direct message) with another user.
 * If a direct conversation already exists between the two users, return the existing one.
 *
 * Body: { participant_id: string }
 */
export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, { ...rateLimitConfigs.api, keyPrefix: 'messages-create' })
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

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
    const { participant_id } = body

    if (!participant_id) {
      return NextResponse.json({ error: 'participant_id is required' }, { status: 400 })
    }

    if (typeof participant_id !== 'string' || participant_id.length > 100) {
      return NextResponse.json({ error: 'Invalid participant_id' }, { status: 400 })
    }

    const sanitizedParticipantId = sanitizeText(participant_id)

    if (sanitizedParticipantId === user.id) {
      return NextResponse.json({ error: 'Cannot create a conversation with yourself' }, { status: 400 })
    }

    // Check if the other user has blocked the current user (or vice versa)
    const { data: blockCheck } = await supabase
      .from('user_blocks')
      .select('id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${sanitizedParticipantId}),and(blocker_id.eq.${sanitizedParticipantId},blocked_id.eq.${user.id})`)
      .limit(1)

    if (blockCheck && blockCheck.length > 0) {
      return NextResponse.json({ error: 'Cannot create conversation with this user' }, { status: 403 })
    }

    // Verify the other user exists
    const { data: otherUser, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', sanitizedParticipantId)
      .single()

    if (userError || !otherUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if a direct conversation already exists between these two users
    const { data: myConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (myConversations && myConversations.length > 0) {
      const myConvIds = myConversations.map((c) => c.conversation_id)

      const { data: sharedConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', sanitizedParticipantId)
        .in('conversation_id', myConvIds)

      if (sharedConversations && sharedConversations.length > 0) {
        // Check if any of these are direct conversations
        for (const sc of sharedConversations) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', sc.conversation_id)
            .eq('type', 'direct')
            .single()

          if (conv) {
            // Return existing conversation
            return NextResponse.json({
              conversation: { ...conv, other_user: otherUser },
              existing: true,
            })
          }
        }
      }
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: user.id,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (convError || !conversation) {
      log.error('Error creating conversation', { component: 'Messages', action: 'createConversation' }, convError)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Add both users as participants
    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert([
        {
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'owner',
          last_read_at: new Date().toISOString(),
          is_muted: false,
        },
        {
          conversation_id: conversation.id,
          user_id: sanitizedParticipantId,
          role: 'member',
          last_read_at: new Date().toISOString(),
          is_muted: false,
        },
      ])

    if (participantError) {
      log.error('Error adding participants', { component: 'Messages', action: 'createConversation' }, participantError)
      // Cleanup the conversation
      await supabase.from('conversations').delete().eq('id', conversation.id)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    log.info('Conversation created', {
      component: 'Messages',
      action: 'createConversation',
      userId: user.id,
      participantId: sanitizedParticipantId,
      conversationId: conversation.id,
    })

    return NextResponse.json(
      { conversation: { ...conversation, other_user: otherUser }, existing: false },
      { status: 201 }
    )
  } catch (error) {
    log.error('Unexpected error in POST /api/messages', { component: 'Messages', action: 'createConversation' }, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
