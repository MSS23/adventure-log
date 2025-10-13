'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

export interface Like {
  id: string
  user_id: string
  target_type: 'photo' | 'album' | 'comment' | 'story' | 'location'
  target_id: string
  created_at: string
  users?: {
    name: string
    avatar_url?: string
  }
}

export function useLikes(albumId?: string, photoId?: string, storyId?: string) {
  const [likes, setLikes] = useState<Like[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchLikes = useCallback(async () => {
    try {
      let query = supabase
        .from('likes')
        .select('id, user_id, target_type, target_id, created_at')
        .order('created_at', { ascending: false })

      if (albumId) {
        query = query.eq('target_type', 'album').eq('target_id', albumId)
      } else if (photoId) {
        query = query.eq('target_type', 'photo').eq('target_id', photoId)
      } else if (storyId) {
        query = query.eq('target_type', 'story').eq('target_id', storyId)
      }

      const { data: likesData, error: likesError } = await query

      if (likesError) throw likesError

      // Set likes without fetching user data to improve performance
      setLikes((likesData || []) as Like[])
    } catch (error) {
      log.error('Error fetching likes', { error })
    }
  }, [supabase, albumId, photoId, storyId])

  const checkIfLiked = useCallback(async () => {
    if (!user) return

    try {
      let query = supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)

      if (albumId) {
        query = query.eq('target_type', 'album').eq('target_id', albumId)
      } else if (photoId) {
        query = query.eq('target_type', 'photo').eq('target_id', photoId)
      } else if (storyId) {
        query = query.eq('target_type', 'story').eq('target_id', storyId)
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      setIsLiked(!!data)
    } catch (error) {
      log.error('Error checking if liked', {}, error)
    }
  }, [user, supabase, albumId, photoId, storyId])

  // Fetch likes and check if liked only when IDs change or user changes
  useEffect(() => {
    if (albumId || photoId || storyId) {
      fetchLikes()
      if (user) {
        checkIfLiked()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, photoId, storyId, user?.id]) // Only depend on user.id, not the whole user object or functions

  const toggleLike = useCallback(async () => {
    if (!user || loading) return

    // Optimistic update - update UI immediately for instant feedback
    const previousIsLiked = isLiked
    const previousLikes = likes

    setIsLiked(!isLiked)
    if (!isLiked) {
      // Optimistically add like
      const newLike: Like = {
        id: 'temp-' + Date.now(),
        user_id: user.id,
        target_type: albumId ? 'album' : storyId ? 'story' : 'photo',
        target_id: (albumId || photoId || storyId) as string,
        created_at: new Date().toISOString()
      }
      setLikes([newLike, ...likes])
    } else {
      // Optimistically remove like
      setLikes(likes.filter(like => like.user_id !== user.id))
    }

    setLoading(true)
    try {
      if (previousIsLiked) {
        // Remove like
        let query = supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)

        if (albumId) {
          query = query.eq('target_type', 'album').eq('target_id', albumId)
        } else if (photoId) {
          query = query.eq('target_type', 'photo').eq('target_id', photoId)
        } else if (storyId) {
          query = query.eq('target_type', 'story').eq('target_id', storyId)
        }

        const { error } = await query
        if (error) throw error

        log.info('Like removed successfully', {
          albumId,
          photoId,
          storyId,
          userId: user.id
        })
      } else {
        // Add like
        const likeData: { user_id: string; target_type: 'photo' | 'album' | 'story'; target_id: string } = {
          user_id: user.id,
          target_type: albumId ? 'album' : storyId ? 'story' : 'photo',
          target_id: (albumId || photoId || storyId) as string
        }

        const { error } = await supabase
          .from('likes')
          .insert(likeData)
        if (error) throw error

        log.info('Like added successfully', {
          albumId,
          photoId,
          storyId,
          userId: user.id
        })
      }

      // Refresh to get accurate count from server
      await fetchLikes()
      await checkIfLiked()
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousIsLiked)
      setLikes(previousLikes)
      log.error('Error toggling like', { albumId, photoId, storyId }, error)
    } finally {
      setLoading(false)
    }
  }, [user, loading, isLiked, likes, albumId, photoId, storyId, supabase, fetchLikes, checkIfLiked])

  return {
    likes,
    isLiked,
    loading,
    toggleLike,
    likesCount: likes.length
  }
}

export function useComments(albumId?: string, photoId?: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchComments = useCallback(async () => {
    try {
      let query = supabase
        .from('comments')
        .select('id, text, user_id, target_type, target_id, parent_id, created_at, updated_at')
        .order('created_at', { ascending: true })

      if (albumId) {
        query = query.eq('target_type', 'album').eq('target_id', albumId)
      } else if (photoId) {
        query = query.eq('target_type', 'photo').eq('target_id', photoId)
      }

      const { data: commentsData, error: commentsError } = await query

      if (commentsError) throw commentsError

      // Set comments without fetching user data to improve performance
      setComments((commentsData || []) as Comment[])
    } catch (error) {
      log.error('Error fetching comments', {}, error)
    }
  }, [supabase, albumId, photoId])

  useEffect(() => {
    if (albumId || photoId) {
      fetchComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, photoId]) // Remove fetchComments from dependencies to prevent infinite loops

  const addComment = async (text: string) => {
    if (!user || !text.trim() || loading) return

    setLoading(true)
    try {
      const commentData: { text: string; user_id: string; target_type: 'photo' | 'album'; target_id: string } = {
        text: text.trim(),
        user_id: user.id,
        target_type: albumId ? 'album' : 'photo',
        target_id: (albumId || photoId) as string
      }

      const { error } = await supabase
        .from('comments')
        .insert(commentData)

      if (error) throw error

      // Refresh comments
      await fetchComments()
    } catch (error) {
      log.error('Error adding comment', {}, error)
    } finally {
      setLoading(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!user || loading) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id) // Only allow users to delete their own comments

      if (error) throw error

      // Refresh comments
      await fetchComments()
    } catch (error) {
      log.error('Error deleting comment', {}, error)
    } finally {
      setLoading(false)
    }
  }

  return {
    comments,
    loading,
    addComment,
    deleteComment,
    commentsCount: comments.length
  }
}

interface Comment {
  id: string
  text?: string
  content?: string
  user_id: string
  target_type: 'photo' | 'album'
  target_id: string
  parent_id?: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    name?: string
    display_name?: string
    username?: string
    avatar_url?: string
  }
  users?: {
    id: string
    name?: string
    display_name?: string
    username?: string
    avatar_url?: string
  }
  profiles?: {
    id: string
    name?: string
    display_name?: string
    username?: string
    avatar_url?: string
  }
}