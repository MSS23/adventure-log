'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

export interface Like {
  id: string
  user_id: string
  target_type: 'photo' | 'album' | 'comment'
  target_id: string
  created_at: string
  users?: {
    name: string
    avatar_url?: string
  }
}

export function useLikes(albumId?: string, photoId?: string) {
  const [likes, setLikes] = useState<Like[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  const fetchLikes = useCallback(async () => {
    try {
      let query = supabase
        .from('likes')
        .select(`
          id,
          user_id,
          target_type,
          target_id,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (albumId) {
        query = query.eq('target_type', 'album').eq('target_id', albumId)
      } else if (photoId) {
        query = query.eq('target_type', 'photo').eq('target_id', photoId)
      }

      const { data: likesData, error: likesError } = await query

      if (likesError) throw likesError

      // Fetch user data separately for users whose data is accessible
      const likesWithUsers = await Promise.all(
        (likesData || []).map(async (like) => {
          try {
            const { data: user } = await supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', like.user_id)
              .single()

            return {
              ...like,
              users: user || undefined
            }
          } catch {
            // If user can't be accessed due to RLS, continue without it
            return {
              ...like,
              users: undefined
            }
          }
        })
      )

      setLikes(likesWithUsers as Like[])
    } catch (error) {
      log.error('Error fetching likes', { error })
    }
  }, [supabase, albumId, photoId])

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
      }

      const { data, error } = await query.maybeSingle()

      if (error) throw error
      setIsLiked(!!data)
    } catch (error) {
      log.error('Error checking if liked', {}, error)
    }
  }, [user, supabase, albumId, photoId])

  useEffect(() => {
    if (albumId || photoId) {
      fetchLikes()
      checkIfLiked()
    }
  }, [albumId, photoId, user, fetchLikes, checkIfLiked])

  const toggleLike = async () => {
    if (!user || loading) return

    setLoading(true)
    try {
      if (isLiked) {
        // Remove like
        let query = supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)

        if (albumId) {
          query = query.eq('target_type', 'album').eq('target_id', albumId)
        } else if (photoId) {
          query = query.eq('target_type', 'photo').eq('target_id', photoId)
        }

        const { error } = await query

        if (error) throw error
        setIsLiked(false)
      } else {
        // Add like
        const likeData: { user_id: string; target_type: 'photo' | 'album'; target_id: string } = {
          user_id: user.id,
          target_type: albumId ? 'album' : 'photo',
          target_id: (albumId || photoId) as string
        }

        const { error } = await supabase
          .from('likes')
          .insert(likeData)

        if (error) throw error
        setIsLiked(true)
      }

      // Refresh likes count
      await fetchLikes()
    } catch (error) {
      log.error('Error toggling like', {}, error)
    } finally {
      setLoading(false)
    }
  }

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
        .select(`
          id,
          text,
          user_id,
          target_type,
          target_id,
          parent_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: true })

      if (albumId) {
        query = query.eq('target_type', 'album').eq('target_id', albumId)
      } else if (photoId) {
        query = query.eq('target_type', 'photo').eq('target_id', photoId)
      }

      const { data: commentsData, error: commentsError } = await query

      if (commentsError) throw commentsError

      // Fetch user data separately for users whose data is accessible
      const commentsWithUsers = await Promise.all(
        (commentsData || []).map(async (comment) => {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('name, avatar_url')
              .eq('id', comment.user_id)
              .single()

            return {
              ...comment,
              users: userData || undefined
            }
          } catch {
            // If user can't be accessed due to RLS, continue without it
            return {
              ...comment,
              users: undefined
            }
          }
        })
      )

      setComments(commentsWithUsers as Comment[])
    } catch (error) {
      log.error('Error fetching comments', {}, error)
    }
  }, [supabase, albumId, photoId])

  useEffect(() => {
    if (albumId || photoId) {
      fetchComments()
    }
  }, [albumId, photoId, fetchComments])

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