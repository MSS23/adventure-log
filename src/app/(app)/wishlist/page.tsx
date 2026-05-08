import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { log } from '@/lib/utils/logger'
import type { WishlistItem, TravelPartner } from '@/lib/hooks/useWishlist'
import WishlistContent from './WishlistContent'

export default async function WishlistPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch wishlist items
  let initialItems: WishlistItem[] = []
  const { data: wishlistData, error: wishlistError } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (wishlistError) {
    // Silently handle missing table - wishlist_items may not exist yet
    if (wishlistError.code !== 'PGRST205' && wishlistError.code !== 'PGRST200' && wishlistError.code !== '42P01') {
      log.error('Error fetching wishlist items', {
        component: 'WishlistPage',
        action: 'server-fetch',
        userId: user.id,
      }, wishlistError)
    }
  } else if (wishlistData) {
    initialItems = wishlistData

    // Fetch shared_by user info for items that have shared_by_user_id
    const sharedByIds = [...new Set(
      initialItems.filter(i => i.shared_by_user_id).map(i => i.shared_by_user_id)
    )].filter(Boolean) as string[]

    if (sharedByIds.length > 0) {
      const { data: sharedByUsers } = await supabase
        .from('users')
        .select('id, username, display_name')
        .in('id', sharedByIds)

      if (sharedByUsers) {
        const userMap = new Map(sharedByUsers.map(u => [u.id, u]))
        for (const item of initialItems) {
          if (item.shared_by_user_id) {
            const sharedByUser = userMap.get(item.shared_by_user_id)
            if (sharedByUser) {
              item.shared_by = {
                username: sharedByUser.username,
                display_name: sharedByUser.display_name,
              }
            }
          }
        }
      }
    }
  }

  // Fetch travel partners (mutual follows)
  let initialPartners: TravelPartner[] = []

  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
    .eq('status', 'accepted')

  if (following && following.length > 0) {
    const followingIds = following.map(f => f.following_id)

    const { data: mutualFollows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)
      .eq('status', 'accepted')
      .in('follower_id', followingIds)

    if (mutualFollows && mutualFollows.length > 0) {
      const mutualIds = mutualFollows.map(f => f.follower_id)

      const { data: profiles } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', mutualIds)

      if (profiles) {
        initialPartners = profiles
      }
    }
  }

  return (
    <WishlistContent
      initialItems={initialItems}
      initialPartners={initialPartners}
    />
  )
}
