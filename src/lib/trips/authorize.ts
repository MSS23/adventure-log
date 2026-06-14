import type { SupabaseClient } from '@supabase/supabase-js'

export type TripRole = 'owner' | 'editor' | 'viewer' | null

export interface TripAccess {
  /** Whether the trip row exists at all. */
  exists: boolean
  /** Current user is the trip owner. */
  isOwner: boolean
  /** Current user is the owner or an explicit member. */
  isMember: boolean
  /** Trip is publicly shared (is_public = true). */
  isPublic: boolean
  /** Effective role for the current user, or null if none. */
  role: TripRole
  ownerId: string | null
}

/**
 * Resolve what the given user is allowed to do with a trip.
 *
 * The trip API routes must not rely solely on RLS — the policies were churned
 * during the Clerk migration (m31–m39) and their live state can't be verified
 * from the source tree. This gives every route an explicit, code-level
 * ownership/membership check (defense-in-depth).
 */
export async function getTripAccess(
  supabase: SupabaseClient,
  tripId: string,
  userId: string,
): Promise<TripAccess> {
  const { data: trip } = await supabase
    .from('trips')
    .select('owner_id, is_public')
    .eq('id', tripId)
    .maybeSingle()

  if (!trip) {
    return { exists: false, isOwner: false, isMember: false, isPublic: false, role: null, ownerId: null }
  }

  const isOwner = trip.owner_id === userId
  let isMember = isOwner
  let role: TripRole = isOwner ? 'owner' : null

  if (!isOwner) {
    const { data: membership } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .maybeSingle()
    if (membership) {
      isMember = true
      role = (membership.role as TripRole) ?? 'viewer'
    }
  }

  return {
    exists: true,
    isOwner,
    isMember,
    isPublic: trip.is_public === true,
    role,
    ownerId: trip.owner_id ?? null,
  }
}
