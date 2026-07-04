import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin, isRlsError } from '@/lib/supabase/admin'
import { log } from '@/lib/utils/logger'

const VALID_ROLES = ['contributor', 'editor', 'viewer', 'tagged'] as const
type Role = (typeof VALID_ROLES)[number]

/**
 * Invite a collaborator to an album AND notify them.
 *
 * Centralizes the invite so both invite UIs (CollaborativeAlbum dialog and
 * CollaboratorManager) get identical behavior:
 *  - only the album owner may invite
 *  - the invitee is resolved by user id OR username/email
 *  - the album_collaborators row and the in-app notification are created
 *    together, server-side. The notification is written with the service-role
 *    client because it targets ANOTHER user's row (the invitee), which the
 *    client-side RLS context can't reliably insert.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: albumId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userId?: string; query?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const role: Role = VALID_ROLES.includes(body.role as Role) ? (body.role as Role) : 'contributor'

  try {
    // Only the album owner may invite collaborators.
    const { data: album } = await supabase
      .from('albums')
      .select('id, title, user_id')
      .eq('id', albumId)
      .maybeSingle()

    if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 })
    if (album.user_id !== userId) {
      return NextResponse.json({ error: 'Only the album owner can invite collaborators' }, { status: 403 })
    }

    // Resolve the invitee — by explicit id, or by username/email lookup.
    // The lookup uses the RLS-bound client (user profiles are public-read); if a
    // service-role key happens to be configured we retry through it so that
    // email-based lookups still resolve even where email isn't publicly selectable.
    let inviteeId = body.userId?.trim() || null
    if (!inviteeId) {
      const q = body.query?.trim()
      if (!q) return NextResponse.json({ error: 'Provide a user id, username, or email' }, { status: 400 })
      // Resolve by username OR email using parameterized .eq() lookups. We avoid a
      // raw interpolated .or(`username.eq.${q},email.eq.${q}`) here because the
      // user-controlled value would be spliced into the PostgREST filter grammar
      // (filter injection + email enumeration), and the fallback runs on the
      // RLS-bypassing admin client.
      let found: { id: string } | null = null
      const byUsername = await supabase.from('users').select('id').eq('username', q).maybeSingle()
      found = byUsername.data
      if (!found) {
        // Email→id via the find_user_id_by_email() SECURITY DEFINER RPC
        // (migration 76): the users PII lockdown revokes SELECT on the email
        // column, so even `.select('id').eq('email', q)` is permission-denied
        // for the RLS-bound client.
        const rpcLookup = await supabase.rpc('find_user_id_by_email', { p_email: q })
        if (!rpcLookup.error && rpcLookup.data) {
          found = { id: rpcLookup.data as string }
        }
      }
      if (!found) {
        // Pre-migration-75 fallback: direct email read. Once the lockdown is
        // applied this returns a permission error with data=null and falls
        // through harmlessly to the admin-client lookup below.
        const byEmail = await supabase.from('users').select('id').eq('email', q).maybeSingle()
        found = byEmail.data
      }
      if (!found && supabaseAdmin) {
        const adminByUsername = await supabaseAdmin.from('users').select('id').eq('username', q).maybeSingle()
        found = adminByUsername.data
        if (!found) {
          const adminByEmail = await supabaseAdmin.from('users').select('id').eq('email', q).maybeSingle()
          found = adminByEmail.data
        }
      }
      if (!found) return NextResponse.json({ error: 'No user found with that username or email' }, { status: 404 })
      inviteeId = found.id
    }

    if (inviteeId === userId) {
      return NextResponse.json({ error: 'You already own this album' }, { status: 400 })
    }

    // Create the invite. The "Album owners can manage collaborators" RLS policy
    // (migration 15) lets the authenticated owner insert this row directly, so no
    // service-role key is needed; we retry with the admin client only if RLS
    // rejects the insert and a key is configured. Ownership was verified above.
    const invitePayload = {
      album_id: albumId,
      user_id: inviteeId,
      role,
      status: 'pending',
      invited_by: userId,
    }
    const inviteSelect = '*, user:user_id(id, username, display_name, avatar_url)'
    let { data: collaborator, error: inviteError } = await supabase
      .from('album_collaborators')
      .insert(invitePayload)
      .select(inviteSelect)
      .single()

    if (inviteError && isRlsError(inviteError) && supabaseAdmin) {
      ;({ data: collaborator, error: inviteError } = await supabaseAdmin
        .from('album_collaborators')
        .insert(invitePayload)
        .select(inviteSelect)
        .single())
    }

    if (inviteError) {
      if (inviteError.code === '23505') {
        return NextResponse.json({ error: 'This user is already a collaborator' }, { status: 409 })
      }
      throw inviteError
    }

    // Notify the invitee (best-effort — never fail the invite over a notification).
    // Since migration 73, notifications INSERT is service-role only, so the
    // service-role client is the primary path; the RLS client is a last resort
    // for environments without the admin key (where it will be refused, and the
    // invite still succeeds without a notification).
    try {
      const { data: inviter } = await supabase
        .from('users')
        .select('display_name, username')
        .eq('id', userId)
        .maybeSingle()
      const inviterName = inviter?.display_name || inviter?.username || 'Someone'

      // A "tagged" credit reads differently from a collaboration invite.
      const isTag = role === 'tagged'
      const notification = {
        user_id: inviteeId,
        sender_id: userId,
        type: isTag ? 'album_tag' : 'album_invite',
        title: isTag ? 'You were tagged' : 'Album invitation',
        message: isTag
          ? `${inviterName} tagged you in "${album.title}"`
          : `${inviterName} invited you to collaborate on "${album.title}"`,
        link: isTag ? `/albums/${albumId}` : '/feed',
        metadata: { album_id: albumId, collaborator_id: collaborator!.id },
      }

      if (supabaseAdmin) {
        await supabaseAdmin.from('notifications').insert(notification)
      } else {
        await supabase.from('notifications').insert(notification)
      }
    } catch (notifyErr) {
      log.error(
        'Invite created but notification failed',
        { component: 'api/albums/collaborators', action: 'notify', albumId, inviteeId },
        notifyErr as Error,
      )
    }

    return NextResponse.json({ collaborator }, { status: 201 })
  } catch (error) {
    log.error(
      'Failed to invite collaborator',
      { component: 'api/albums/collaborators', action: 'invite', albumId, userId },
      error as Error,
    )
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}
