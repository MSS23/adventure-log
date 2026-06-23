import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

export interface Favorite {
  id: string
  user_id: string
  target_id: string
  target_type: 'photo' | 'album' | 'location'
  created_at: string
  metadata?: {
    photo_url?: string
    title?: string
    description?: string
    tags?: string[]
  }
}

interface UseFavoritesOptions {
  targetType?: 'photo' | 'album' | 'location'
  targetId?: string
  autoFetch?: boolean
}

export function useFavorites(options: UseFavoritesOptions = {}) {
  const { targetType, targetId, autoFetch = true } = options
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(!!autoFetch)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch all favorites for the user
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('favorites')
        .select(`
          id,
          user_id,
          target_id,
          target_type,
          created_at,
          metadata
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Filter by target type if specified
      if (targetType) {
        query = query.eq('target_type', targetType)
      }

      // Filter by target ID if specified
      if (targetId) {
        query = query.eq('target_id', targetId)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw queryError
      }

      setFavorites(data || [])
      log.debug('Favorites fetched successfully', {
        component: 'useFavorites',
        action: 'fetchFavorites',
        count: data?.length || 0,
        targetType,
        targetId
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch favorites'
      setError(errorMessage)
      log.error('Failed to fetch favorites', { error: err })
    } finally {
      setLoading(false)
    }
  }, [user, targetType, targetId, supabase])

  // Check if a specific item is favorited
  const isFavorited = useCallback((itemId: string, itemType: 'photo' | 'album' | 'location' = 'photo') => {
    return favorites.some(fav =>
      fav.target_id === itemId &&
      fav.target_type === itemType
    )
  }, [favorites])

  // Add a favorite
  const addFavorite = useCallback(async (
    itemId: string,
    itemType: 'photo' | 'album' | 'location' = 'photo',
    metadata?: Favorite['metadata']
  ) => {
    if (!user) {
      throw new Error('Must be logged in to add favorites')
    }

    // Check if already favorited
    if (isFavorited(itemId, itemType)) {
      return
    }

    // Optimistic insert: show the favorite immediately with a temporary id,
    // then swap in the real row (or roll back on error).
    const optimistic: Favorite = {
      id: `temp-${itemType}-${itemId}`,
      user_id: user.id,
      target_id: itemId,
      target_type: itemType,
      created_at: new Date().toISOString(),
      metadata: metadata || {}
    }
    setFavorites(prev => [optimistic, ...prev])

    try {
      const { data, error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          target_id: itemId,
          target_type: itemType,
          metadata: metadata || {}
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Replace the optimistic row with the persisted one.
      setFavorites(prev => prev.map(fav => (fav.id === optimistic.id ? data : fav)))

      log.info('Added favorite successfully', {
        component: 'useFavorites',
        action: 'addFavorite',
        targetId: itemId,
        targetType: itemType
      })

      return data

    } catch (err) {
      // Roll back the optimistic row.
      setFavorites(prev => prev.filter(fav => fav.id !== optimistic.id))
      const errorMessage = err instanceof Error ? err.message : 'Failed to add favorite'
      setError(errorMessage)
      log.error('Failed to add favorite', { error: err })
      throw err
    }
  }, [user, isFavorited, supabase])

  // Remove a favorite
  const removeFavorite = useCallback(async (
    itemId: string,
    itemType: 'photo' | 'album' | 'location' = 'photo'
  ) => {
    if (!user) {
      throw new Error('Must be logged in to remove favorites')
    }

    // Optimistic removal: snapshot the rows we drop so we can restore them on error.
    const removed = favorites.filter(
      fav => fav.target_id === itemId && fav.target_type === itemType
    )
    setFavorites(prev =>
      prev.filter(fav => !(fav.target_id === itemId && fav.target_type === itemType))
    )

    try {
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('target_id', itemId)
        .eq('target_type', itemType)

      if (deleteError) {
        throw deleteError
      }

      log.info('Removed favorite successfully', {
        component: 'useFavorites',
        action: 'removeFavorite',
        targetId: itemId,
        targetType: itemType
      })

    } catch (err) {
      // Roll back: restore the removed rows.
      if (removed.length > 0) {
        setFavorites(prev => [...removed, ...prev])
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove favorite'
      setError(errorMessage)
      log.error('Failed to remove favorite', { error: err })
      throw err
    }
  }, [user, favorites, supabase])

  // Toggle favorite status
  const toggleFavorite = useCallback(async (
    itemId: string,
    itemType: 'photo' | 'album' | 'location' = 'photo',
    metadata?: Favorite['metadata']
  ) => {
    if (isFavorited(itemId, itemType)) {
      await removeFavorite(itemId, itemType)
      return false
    } else {
      await addFavorite(itemId, itemType, metadata)
      return true
    }
  }, [isFavorited, removeFavorite, addFavorite])

  // Get favorites count for a specific type
  const getFavoritesCount = useCallback((itemType?: 'photo' | 'album' | 'location') => {
    if (itemType) {
      return favorites.filter(fav => fav.target_type === itemType).length
    }
    return favorites.length
  }, [favorites])

  // Get recent favorites
  const getRecentFavorites = useCallback((limit: number = 10, itemType?: 'photo' | 'album' | 'location') => {
    let filteredFavorites = favorites

    if (itemType) {
      filteredFavorites = favorites.filter(fav => fav.target_type === itemType)
    }

    return filteredFavorites.slice(0, limit)
  }, [favorites])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch && user) {
      fetchFavorites()
    }
  }, [autoFetch, fetchFavorites, user])

  // Clear favorites when user logs out
  useEffect(() => {
    if (!user) {
      setFavorites([])
      setError(null)
    }
  }, [user])

  return {
    favorites,
    loading,
    error,
    fetchFavorites,
    isFavorited,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    getFavoritesCount,
    getRecentFavorites,
    // Computed values
    photoFavorites: favorites.filter(fav => fav.target_type === 'photo'),
    albumFavorites: favorites.filter(fav => fav.target_type === 'album'),
    locationFavorites: favorites.filter(fav => fav.target_type === 'location'),
  }
}

// Specialized hook for photo favorites
export function usePhotoFavorites(photoId?: string) {
  return useFavorites({
    targetType: 'photo',
    targetId: photoId,
    autoFetch: true
  })
}

// Specialized hook for album favorites
export function useAlbumFavorites(albumId?: string) {
  return useFavorites({
    targetType: 'album',
    targetId: albumId,
    autoFetch: true
  })
}

// Specialized hook for location favorites
export function useLocationFavorites(locationId?: string) {
  return useFavorites({
    targetType: 'location',
    targetId: locationId,
    autoFetch: true
  })
}