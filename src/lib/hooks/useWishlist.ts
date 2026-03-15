'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'

export interface WishlistItem {
  id: string
  user_id: string
  location_name: string
  country_code: string | null
  latitude: number
  longitude: number
  notes: string | null
  priority: 'low' | 'medium' | 'high'
  source: 'manual' | 'from_album' | 'shared'
  shared_by_user_id: string | null
  shared_by?: { username: string; display_name: string | null } | null
  created_at: string
  completed_at: string | null
}

export interface TravelPartner {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface AddItemParams {
  location_name: string
  country_code?: string | null
  latitude: number
  longitude: number
  notes?: string | null
  priority?: 'low' | 'medium' | 'high'
  source?: 'manual' | 'from_album' | 'shared'
}

interface UpdateItemParams {
  notes?: string | null
  priority?: 'low' | 'medium' | 'high'
  completed_at?: string | null
  location_name?: string
  country_code?: string | null
}

interface SuggestParams {
  location_name: string
  country_code?: string | null
  latitude: number
  longitude: number
  notes?: string | null
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [partnerWishlists, setPartnerWishlists] = useState<Map<string, WishlistItem[]>>(new Map())
  const [travelPartners, setTravelPartners] = useState<TravelPartner[]>([])

  const supabase = createClient()

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // Silently handle missing table - wishlist_items may not exist yet
        if (error.code === 'PGRST205' || error.code === 'PGRST200' || error.code === '42P01') {
          setLoading(false)
          return
        }
        log.error('Error fetching wishlist items', {
          component: 'useWishlist',
          action: 'fetch'
        }, error)
        return
      }

      // Fetch shared_by user info for items that have shared_by_user_id
      const itemsWithSharedBy = data || []
      const sharedByIds = [...new Set(itemsWithSharedBy.filter(i => i.shared_by_user_id).map(i => i.shared_by_user_id))]

      if (sharedByIds.length > 0) {
        const { data: sharedByUsers } = await supabase
          .from('users')
          .select('id, username, display_name')
          .in('id', sharedByIds)

        if (sharedByUsers) {
          const userMap = new Map(sharedByUsers.map(u => [u.id, u]))
          for (const item of itemsWithSharedBy) {
            if (item.shared_by_user_id) {
              const sharedByUser = userMap.get(item.shared_by_user_id)
              if (sharedByUser) {
                item.shared_by = { username: sharedByUser.username, display_name: sharedByUser.display_name }
              }
            }
          }
        }
      }

      setItems(itemsWithSharedBy)
    } catch (error) {
      log.error('Failed to fetch wishlist items', {
        component: 'useWishlist',
        action: 'fetch'
      }, error as Error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchTravelPartners = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get users that the current user follows (accepted)
      const { data: following, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')

      if (followingError || !following || following.length === 0) {
        setTravelPartners([])
        return
      }

      const followingIds = following.map(f => f.following_id)

      // Among those, find who also follows the current user back (accepted)
      const { data: mutualFollows, error: mutualError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .eq('status', 'accepted')
        .in('follower_id', followingIds)

      if (mutualError || !mutualFollows || mutualFollows.length === 0) {
        setTravelPartners([])
        return
      }

      const mutualIds = mutualFollows.map(f => f.follower_id)

      // Fetch user profiles for mutual follows
      const { data: profiles, error: profilesError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', mutualIds)

      if (profilesError) {
        log.error('Error fetching travel partner profiles', {
          component: 'useWishlist',
          action: 'fetch-partners'
        }, profilesError)
        return
      }

      setTravelPartners(profiles || [])
    } catch (error) {
      log.error('Failed to fetch travel partners', {
        component: 'useWishlist',
        action: 'fetch-partners'
      }, error as Error)
    }
  }, [supabase])

  // Load on mount
  useEffect(() => {
    fetchItems()
    fetchTravelPartners()
  }, [fetchItems, fetchTravelPartners])

  const addItem = useCallback(async (params: AddItemParams): Promise<WishlistItem | null> => {
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add wishlist item')
      }

      const { item } = await res.json()
      setItems(prev => [item, ...prev])
      return item
    } catch (error) {
      log.error('Failed to add wishlist item', {
        component: 'useWishlist',
        action: 'add'
      }, error as Error)
      throw error
    }
  }, [])

  const removeItem = useCallback(async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/wishlist/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to remove wishlist item')
      }

      setItems(prev => prev.filter(item => item.id !== id))
      // Also remove from any cached partner wishlists if present
      setPartnerWishlists(prev => {
        const next = new Map(prev)
        for (const [partnerId, partnerItems] of next) {
          next.set(partnerId, partnerItems.filter(item => item.id !== id))
        }
        return next
      })
    } catch (error) {
      log.error('Failed to remove wishlist item', {
        component: 'useWishlist',
        action: 'remove'
      }, error as Error)
      throw error
    }
  }, [])

  const updateItem = useCallback(async (id: string, updates: UpdateItemParams): Promise<WishlistItem | null> => {
    try {
      const res = await fetch(`/api/wishlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update wishlist item')
      }

      const { item } = await res.json()
      setItems(prev => prev.map(existing => existing.id === id ? item : existing))
      return item
    } catch (error) {
      log.error('Failed to update wishlist item', {
        component: 'useWishlist',
        action: 'update'
      }, error as Error)
      throw error
    }
  }, [])

  const markCompleted = useCallback(async (id: string): Promise<WishlistItem | null> => {
    return updateItem(id, { completed_at: new Date().toISOString() })
  }, [updateItem])

  const suggestToPartner = useCallback(async (partnerId: string, params: SuggestParams): Promise<WishlistItem | null> => {
    try {
      const res = await fetch('/api/wishlist/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerId,
          ...params,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to suggest destination')
      }

      const { item } = await res.json()
      return item
    } catch (error) {
      log.error('Failed to suggest destination to partner', {
        component: 'useWishlist',
        action: 'suggest'
      }, error as Error)
      throw error
    }
  }, [])

  const loadPartnerWishlist = useCallback(async (partnerId: string): Promise<WishlistItem[]> => {
    try {
      const res = await fetch(`/api/wishlist?userId=${partnerId}`)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load partner wishlist')
      }

      const { items: partnerItems } = await res.json()
      setPartnerWishlists(prev => {
        const next = new Map(prev)
        next.set(partnerId, partnerItems)
        return next
      })
      return partnerItems
    } catch (error) {
      log.error('Failed to load partner wishlist', {
        component: 'useWishlist',
        action: 'load-partner',
        partnerId
      }, error as Error)
      throw error
    }
  }, [])

  const refetch = useCallback(async () => {
    await Promise.all([fetchItems(), fetchTravelPartners()])
  }, [fetchItems, fetchTravelPartners])

  return {
    items,
    loading,
    addItem,
    removeItem,
    updateItem,
    markCompleted,
    suggestToPartner,
    partnerWishlists,
    loadPartnerWishlist,
    travelPartners,
    refetch,
  }
}
