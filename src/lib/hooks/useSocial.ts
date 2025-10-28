'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
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
  const { user } = useAuth()

  const fetchLikes = useCallback(async () => {
    const supabase = createClient()
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
  }, [albumId, photoId, storyId])

  const checkIfLiked = useCallback(async () => {
    if (!user) return

    const supabase = createClient()
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
  }, [user, albumId, photoId, storyId])

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

  // Set up real-time subscription for likes
  useEffect(() => {
    if (!albumId && !photoId && !storyId) return

    const supabase = createClient()

    // Build filter based on target
    const filter = supabase
      .channel(`likes_channel_${albumId || photoId || storyId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: albumId
            ? `target_type=eq.album,target_id=eq.${albumId}`
            : photoId
            ? `target_type=eq.photo,target_id=eq.${photoId}`
            : `target_type=eq.story,target_id=eq.${storyId}`
        },
        (payload) => {
          log.info('Real-time like update received', {
            event: payload.eventType,
            targetId: albumId || photoId || storyId
          })

          if (payload.eventType === 'INSERT') {
            const newLike = payload.new as Like
            setLikes(prev => {
              // Check if like already exists (prevent duplicates)
              if (prev.some(l => l.user_id === newLike.user_id)) {
                return prev
              }
              return [newLike, ...prev]
            })
            // Update isLiked if it's the current user's like
            if (user && newLike.user_id === user.id) {
              setIsLiked(true)
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedLike = payload.old as { user_id: string }
            setLikes(prev => prev.filter(like => like.user_id !== deletedLike.user_id))
            // Update isLiked if it's the current user's like
            if (user && deletedLike.user_id === user.id) {
              setIsLiked(false)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(filter)
    }
  }, [albumId, photoId, storyId, user?.id])

  const toggleLike = useCallback(async () => {
    if (!user) return

    // Optimistic update - update UI immediately for instant feedback
    const previousIsLiked = isLiked
    const previousLikesCount = likes.length

    // Immediately update UI without setting loading state
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

    // Don't set loading state - keep button responsive
    const supabase = createClient()
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

      // Don't refetch - trust the optimistic update
      // The UI is already showing the correct state
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(previousIsLiked)
      // Restore previous likes count by reconstructing array
      if (!previousIsLiked && likes.length > previousLikesCount) {
        // We added optimistically, remove the temp one
        setLikes(likes.slice(1))
      } else if (previousIsLiked && likes.length < previousLikesCount) {
        // We removed optimistically, add it back
        const restoredLike: Like = {
          id: 'restored-' + Date.now(),
          user_id: user.id,
          target_type: albumId ? 'album' : storyId ? 'story' : 'photo',
          target_id: (albumId || photoId || storyId) as string,
          created_at: new Date().toISOString()
        }
        setLikes([restoredLike, ...likes])
      }
      log.error('Error toggling like', { albumId, photoId, storyId }, error)
    }
  }, [user, isLiked, likes, albumId, photoId, storyId])

  return {
    likes,
    isLiked,
    toggleLike,
    likesCount: likes.length
  }
}

export function useComments(albumId?: string, photoId?: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const fetchComments = useCallback(async () => {
    const supabase = createClient()
    try {
      let query = supabase
        .from('comments')
        .select(`
          id,
          content,
          user_id,
          target_type,
          target_id,
          parent_id,
          created_at,
          updated_at,
          users!comments_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: true })

      if (albumId) {
        query = query.eq('target_type', 'album').eq('target_id', albumId)
      } else if (photoId) {
        query = query.eq('target_type', 'photo').eq('target_id', photoId)
      }

      const { data: commentsData, error: commentsError } = await query

      if (commentsError) throw commentsError

      // Transform the data to match Comment interface
      // Supabase returns users as a single object, but we need to handle the type properly
      const transformedComments = (commentsData || []).map((comment: Record<string, unknown>) => ({
        ...comment,
        // Ensure users is treated as a single object, not an array
        users: Array.isArray(comment.users) ? comment.users[0] : comment.users
      }))

      setComments(transformedComments as Comment[])
    } catch (error) {
      log.error('Error fetching comments', {}, error)
    }
  }, [albumId, photoId])

  useEffect(() => {
    if (albumId || photoId) {
      fetchComments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, photoId]) // Remove fetchComments from dependencies to prevent infinite loops

  const addComment = async (text: string) => {
    if (!user || !text.trim() || loading) return

    setLoading(true)
    const supabase = createClient()
    try {
      const commentData: { content: string; user_id: string; target_type: 'photo' | 'album'; target_id: string } = {
        content: text.trim(),
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
    const supabase = createClient()
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
  content: string
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