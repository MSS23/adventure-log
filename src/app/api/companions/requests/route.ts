import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/utils/logger'

// GET /api/companions/requests - Get incoming and outgoing companion requests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get incoming requests
    const { data: incoming, error: incomingError } = await supabase
      .from('companion_requests')
      .select(`
        *,
        sender:users!companion_requests_sender_id_fkey(id, name, username, display_name, avatar_url, bio, location)
      `)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })

    if (incomingError) {
      log.error('Failed to fetch incoming requests', {
        component: 'CompanionRequestsAPI',
        action: 'get-incoming',
        userId: user.id,
      }, incomingError)
    }

    // Get outgoing requests
    const { data: outgoing, error: outgoingError } = await supabase
      .from('companion_requests')
      .select(`
        *,
        receiver:users!companion_requests_receiver_id_fkey(id, name, username, display_name, avatar_url, bio, location)
      `)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })

    if (outgoingError) {
      log.error('Failed to fetch outgoing requests', {
        component: 'CompanionRequestsAPI',
        action: 'get-outgoing',
        userId: user.id,
      }, outgoingError)
    }

    return NextResponse.json({
      data: {
        incoming: incoming || [],
        outgoing: outgoing || [],
      },
    })
  } catch (error) {
    log.error('Companion requests API error', { component: 'CompanionRequestsAPI', action: 'get' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/companions/requests - Send a companion request
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
    const { receiver_id, destination, date_start, date_end, message } = body

    if (!receiver_id) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 })
    }

    if (receiver_id === user.id) {
      return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 })
    }

    // Check if a request already exists between these users
    const { data: existingRequest } = await supabase
      .from('companion_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${user.id})`)
      .in('status', ['pending', 'accepted'])
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'A request already exists between you and this user' },
        { status: 409 }
      )
    }

    const { data: newRequest, error: insertError } = await supabase
      .from('companion_requests')
      .insert({
        sender_id: user.id,
        receiver_id,
        destination: destination || null,
        date_start: date_start || null,
        date_end: date_end || null,
        message: message || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        receiver:users!companion_requests_receiver_id_fkey(id, name, username, display_name, avatar_url)
      `)
      .single()

    if (insertError) {
      log.error('Failed to create companion request', {
        component: 'CompanionRequestsAPI',
        action: 'create-request',
        userId: user.id,
      }, insertError)
      return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
    }

    log.info('Companion request sent', {
      component: 'CompanionRequestsAPI',
      action: 'create-request',
      userId: user.id,
      receiverId: receiver_id,
    })

    return NextResponse.json({ data: newRequest }, { status: 201 })
  } catch (error) {
    log.error('Companion requests API error', { component: 'CompanionRequestsAPI', action: 'post' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/companions/requests - Accept or decline a companion request
export async function PATCH(request: NextRequest) {
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
    const { request_id, status } = body

    if (!request_id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 })
    }

    if (!['accepted', 'declined', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be accepted, declined, or cancelled' },
        { status: 400 }
      )
    }

    // Verify the user is the receiver (for accept/decline) or sender (for cancel)
    const { data: existingRequest, error: fetchError } = await supabase
      .from('companion_requests')
      .select('*')
      .eq('id', request_id)
      .single()

    if (fetchError || !existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only receiver can accept/decline, only sender can cancel
    if (status === 'cancelled' && existingRequest.sender_id !== user.id) {
      return NextResponse.json({ error: 'Only the sender can cancel a request' }, { status: 403 })
    }

    if (['accepted', 'declined'].includes(status) && existingRequest.receiver_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the receiver can accept or decline a request' },
        { status: 403 }
      )
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('companion_requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request_id)
      .select()
      .single()

    if (updateError) {
      log.error('Failed to update companion request', {
        component: 'CompanionRequestsAPI',
        action: 'update-request',
        userId: user.id,
      }, updateError)
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    log.info('Companion request updated', {
      component: 'CompanionRequestsAPI',
      action: 'update-request',
      userId: user.id,
      requestId: request_id,
      newStatus: status,
    })

    return NextResponse.json({ data: updatedRequest })
  } catch (error) {
    log.error('Companion requests API error', { component: 'CompanionRequestsAPI', action: 'patch' }, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
