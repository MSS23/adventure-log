/*
 * Migration SQL for wishlist_items table:
 *
 * CREATE TABLE wishlist_items (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *   location_name TEXT NOT NULL,
 *   country_code TEXT,
 *   latitude DOUBLE PRECISION NOT NULL,
 *   longitude DOUBLE PRECISION NOT NULL,
 *   notes TEXT,
 *   priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
 *   source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'from_album', 'shared')),
 *   shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   completed_at TIMESTAMPTZ,
 *   UNIQUE(user_id, location_name, latitude, longitude)
 * );
 *
 * CREATE INDEX idx_wishlist_items_user_id ON wishlist_items(user_id);
 * CREATE INDEX idx_wishlist_items_completed ON wishlist_items(user_id, completed_at);
 *
 * -- RLS policies
 * ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
 *
 * CREATE POLICY "Users can view own wishlist items"
 *   ON wishlist_items FOR SELECT
 *   USING (user_id = (select auth.uid()));
 *
 * CREATE POLICY "Users can insert own wishlist items"
 *   ON wishlist_items FOR INSERT
 *   WITH CHECK (user_id = (select auth.uid()));
 *
 * CREATE POLICY "Users can update own wishlist items"
 *   ON wishlist_items FOR UPDATE
 *   USING (user_id = (select auth.uid()));
 *
 * CREATE POLICY "Users can delete own wishlist items"
 *   ON wishlist_items FOR DELETE
 *   USING (user_id = (select auth.uid()));
 *
 * -- Allow mutual follows to view each other's wishlist
 * CREATE POLICY "Mutual follows can view wishlist items"
 *   ON wishlist_items FOR SELECT
 *   USING (
 *     EXISTS (
 *       SELECT 1 FROM follows f1
 *       JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
 *       WHERE f1.follower_id = (select auth.uid())
 *         AND f1.following_id = wishlist_items.user_id
 *         AND f1.status = 'accepted'
 *         AND f2.status = 'accepted'
 *     )
 *   );
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/utils/logger'

async function checkMutualFollow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  // Check that currentUser follows targetUser AND targetUser follows currentUser
  const { data: forward } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!forward) return false

  const { data: reverse } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', targetUserId)
    .eq('following_id', currentUserId)
    .eq('status', 'accepted')
    .maybeSingle()

  return !!reverse
}

// GET /api/wishlist - Fetch wishlist items (own or a mutual follow's)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

    let targetUserId = user.id

    // If requesting another user's wishlist, verify mutual follow
    if (userId && userId !== user.id) {
      const isMutual = await checkMutualFollow(supabase, user.id, userId)
      if (!isMutual) {
        return NextResponse.json(
          { error: 'You can only view wishlists of mutual follows' },
          { status: 403 }
        )
      }
      targetUserId = userId
    }

    let query = supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })

    if (!includeCompleted) {
      query = query.is('completed_at', null)
    }

    const { data, error } = await query

    if (error) {
      log.error('Error fetching wishlist items', {
        component: 'WishlistAPI',
        action: 'fetch',
        userId: user.id
      }, error)
      throw error
    }

    // Enrich items with shared_by user info
    const items = data || []
    const sharedByIds = [...new Set(items.filter(i => i.shared_by_user_id).map(i => i.shared_by_user_id))]

    if (sharedByIds.length > 0) {
      const { data: sharedByUsers } = await supabase
        .from('users')
        .select('id, username, display_name')
        .in('id', sharedByIds)

      if (sharedByUsers) {
        const userMap = new Map(sharedByUsers.map((u: { id: string; username: string; display_name: string | null }) => [u.id, u]))
        for (const item of items) {
          if (item.shared_by_user_id) {
            item.shared_by = userMap.get(item.shared_by_user_id) || null
          }
        }
      }
    }

    return NextResponse.json({ items })
  } catch (error) {
    log.error('Failed to fetch wishlist items', {
      component: 'WishlistAPI',
      action: 'fetch'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist items' },
      { status: 500 }
    )
  }
}

// POST /api/wishlist - Add a new wishlist item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    if (!body.location_name) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    if (body.latitude == null || body.longitude == null) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    const priority = body.priority || 'medium'
    if (!['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Priority must be low, medium, or high' },
        { status: 400 }
      )
    }

    const source = body.source || 'manual'
    if (!['manual', 'from_album', 'shared'].includes(source)) {
      return NextResponse.json(
        { error: 'Source must be manual, from_album, or shared' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: user.id,
        location_name: body.location_name,
        country_code: body.country_code || null,
        latitude: body.latitude,
        longitude: body.longitude,
        notes: body.notes || null,
        priority,
        source,
        shared_by_user_id: body.shared_by_user_id || null,
      })
      .select('*')
      .single()

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This destination is already on your wishlist' },
          { status: 409 }
        )
      }
      log.error('Error creating wishlist item', {
        component: 'WishlistAPI',
        action: 'create',
        userId: user.id
      }, error)
      throw error
    }

    log.info('Wishlist item created', {
      component: 'WishlistAPI',
      action: 'create',
      userId: user.id,
      itemId: data.id
    })

    return NextResponse.json({
      success: true,
      item: data
    }, { status: 201 })
  } catch (error) {
    log.error('Failed to create wishlist item', {
      component: 'WishlistAPI',
      action: 'create'
    }, error as Error)
    return NextResponse.json(
      { error: 'Failed to create wishlist item' },
      { status: 500 }
    )
  }
}
