/**
 * Playlists Hook
 * Manages Globe Playlists - curated collections of albums and locations
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { 
  Playlist, 
  PlaylistItem, 
  PlaylistWithDetails,
  PlaylistSubscription
} from '@/types/database'

interface CreatePlaylistData {
  title: string
  description?: string
  playlist_type?: 'curated' | 'smart' | 'travel_route' | 'theme'
  category?: string
  tags?: string[]
  visibility?: 'private' | 'friends' | 'followers' | 'public'
  is_collaborative?: boolean
}

interface AddPlaylistItemData {
  album_id?: string
  custom_location_name?: string
  custom_latitude?: number
  custom_longitude?: number
  custom_notes?: string
  notes?: string
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<PlaylistWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch user's playlists (owned, collaborated, subscribed)
  const fetchPlaylists = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .rpc('get_user_playlists', { user_id_param: user.id })

      if (error) throw error

      setPlaylists(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching playlists:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch playlists')
    } finally {
      setLoading(false)
    }
  }

  // Create a new playlist
  const createPlaylist = async (data: CreatePlaylistData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: playlist, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          title: data.title,
          description: data.description,
          playlist_type: data.playlist_type || 'curated',
          category: data.category,
          tags: data.tags,
          visibility: data.visibility || 'public',
          is_collaborative: data.is_collaborative || false,
          allow_subscriptions: true
        })
        .select()
        .single()

      if (error) throw error

      await fetchPlaylists()
      return playlist
    } catch (err) {
      console.error('Error creating playlist:', err)
      throw err
    }
  }

  // Update playlist
  const updatePlaylist = async (
    playlistId: string, 
    updates: Partial<CreatePlaylistData>
  ) => {
    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', playlistId)

      if (error) throw error

      await fetchPlaylists()
    } catch (err) {
      console.error('Error updating playlist:', err)
      throw err
    }
  }

  // Delete playlist
  const deletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)

      if (error) throw error

      await fetchPlaylists()
    } catch (err) {
      console.error('Error deleting playlist:', err)
      throw err
    }
  }

  // Add item to playlist
  const addItemToPlaylist = async (
    playlistId: string, 
    itemData: AddPlaylistItemData
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current item count for order_index
      const { count } = await supabase
        .from('playlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('playlist_id', playlistId)

      const { error } = await supabase
        .from('playlist_items')
        .insert({
          playlist_id: playlistId,
          album_id: itemData.album_id,
          custom_location_name: itemData.custom_location_name,
          custom_latitude: itemData.custom_latitude,
          custom_longitude: itemData.custom_longitude,
          custom_notes: itemData.custom_notes,
          notes: itemData.notes,
          added_by_user_id: user.id,
          order_index: count || 0
        })

      if (error) throw error

      await fetchPlaylists()
    } catch (err) {
      console.error('Error adding item to playlist:', err)
      throw err
    }
  }

  // Remove item from playlist
  const removeItemFromPlaylist = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      await fetchPlaylists()
    } catch (err) {
      console.error('Error removing item from playlist:', err)
      throw err
    }
  }

  // Subscribe to playlist
  const subscribeToPlaylist = async (playlistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('playlist_subscriptions')
        .insert({
          playlist_id: playlistId,
          user_id: user.id,
          is_favorited: false,
          notification_enabled: true
        })

      if (error) throw error

      await fetchPlaylists()
    } catch (err) {
      console.error('Error subscribing to playlist:', err)
      throw err
    }
  }

  // Unsubscribe from playlist
  const unsubscribeFromPlaylist = async (playlistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('playlist_subscriptions')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchPlaylists()
    } catch (err) {
      console.error('Error unsubscribing from playlist:', err)
      throw err
    }
  }

  // Get playlist items
  const getPlaylistItems = async (playlistId: string): Promise<PlaylistItem[]> => {
    try {
      const { data, error } = await supabase
        .from('playlist_items')
        .select(`
          *,
          album:albums(
            id,
            title,
            cover_photo_url,
            location_name,
            latitude,
            longitude,
            country_code
          )
        `)
        .eq('playlist_id', playlistId)
        .order('order_index', { ascending: true })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Error fetching playlist items:', err)
      throw err
    }
  }

  // Discover public playlists
  const discoverPlaylists = async (category?: string, limit = 20) => {
    try {
      let query = supabase
        .from('playlists')
        .select('*, user:profiles(username, display_name, avatar_url)')
        .eq('visibility', 'public')
        .eq('allow_subscriptions', true)
        .order('subscriber_count', { ascending: false })
        .limit(limit)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Error discovering playlists:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchPlaylists()

    // Set up real-time subscription
    const channel = supabase
      .channel('playlists_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'playlists'
        },
        () => {
          fetchPlaylists()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return {
    playlists,
    loading,
    error,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addItemToPlaylist,
    removeItemFromPlaylist,
    subscribeToPlaylist,
    unsubscribeFromPlaylist,
    getPlaylistItems,
    discoverPlaylists,
    refresh: fetchPlaylists
  }
}

