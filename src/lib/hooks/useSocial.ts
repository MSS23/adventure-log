'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthProvider'

export interface Like {
  id: string
  user_id: string
  album_id?: string
  photo_id?: string
  created_at: string
  profiles?: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

export function useLikes(albumId?: string, photoId?: string) {
  const [likes, setLikes] = useState<Like[]>([])
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (albumId || photoId) {
      fetchLikes()
      checkIfLiked()
    }
  }, [albumId, photoId, user])

  const fetchLikes = async () => {
    try {
      let query = supabase
        .from('likes')
        .select(`
          id,
          user_id,
          album_id,
          photo_id,
          created_at,
          profiles:user_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })

      if (albumId) {
        query = query.eq('album_id', albumId)
      }
      if (photoId) {
        query = query.eq('photo_id', photoId)
      }

      const { data, error } = await query

      if (error) throw error
      setLikes((data || []) as unknown as Like[])
    } catch (error) {
      console.error('Error fetching likes:', error)
    }
  }

  const checkIfLiked = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)

      if (albumId) {
        query = query.eq('album_id', albumId)
      }
      if (photoId) {
        query = query.eq('photo_id', photoId)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') throw error
      setIsLiked(!!data)
    } catch (error) {
      console.error('Error checking if liked:', error)
    }
  }

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
          query = query.eq('album_id', albumId)
        }
        if (photoId) {
          query = query.eq('photo_id', photoId)
        }

        const { error } = await query

        if (error) throw error
        setIsLiked(false)
      } else {
        // Add like
        const likeData: { user_id: string; album_id?: string; photo_id?: string } = {
          user_id: user.id,
        }

        if (albumId) {
          likeData.album_id = albumId
        }
        if (photoId) {
          likeData.photo_id = photoId
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
      console.error('Error toggling like:', error)
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

  useEffect(() => {
    if (albumId || photoId) {
      fetchComments()
    }
  }, [albumId, photoId])

  const fetchComments = async () => {
    try {
      let query = supabase
        .from('comments')
        .select(`
          id,
          content,
          user_id,
          album_id,
          photo_id,
          created_at,
          profiles:user_id (
            username,
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: true })

      if (albumId) {
        query = query.eq('album_id', albumId)
      }
      if (photoId) {
        query = query.eq('photo_id', photoId)
      }

      const { data, error } = await query

      if (error) throw error
      setComments((data || []) as unknown as Comment[])
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const addComment = async (content: string) => {
    if (!user || !content.trim() || loading) return

    setLoading(true)
    try {
      const commentData: { content: string; user_id: string; album_id?: string; photo_id?: string } = {
        content: content.trim(),
        user_id: user.id,
      }

      if (albumId) {
        commentData.album_id = albumId
      }
      if (photoId) {
        commentData.photo_id = photoId
      }

      const { error } = await supabase
        .from('comments')
        .insert(commentData)

      if (error) throw error

      // Refresh comments
      await fetchComments()
    } catch (error) {
      console.error('Error adding comment:', error)
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
      console.error('Error deleting comment:', error)
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
  album_id?: string
  photo_id?: string
  created_at: string
  profiles?: {
    username: string
    display_name: string
    avatar_url?: string
  }
}