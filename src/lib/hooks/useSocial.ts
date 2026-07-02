'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

// A Postgres statement timeout (57014) on the social RLS read is expected infra
// noise (see migration 61). We degrade silently to "no likes / not liked"
// instead of logging — anything else is surfaced as a real error.
function isStatementTimeout(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String((error as { code?: unknown }).code) : ''
  const message = 'message' in error ? String((error as { message?: unknown }).message).toLowerCase() : ''
  return code === '57014' || message.includes('canceling statement due to statement timeout')
}

export function useLikes(albumId?: string, photoId?: string, storyId?: string, options?: { fetchList?: boolean; subscribe?: boolean }) {
  const { fetchList = true, subscribe = true } = options ?? {}
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
      // Expected timeout → leave the list empty (count 0) without reporting.
      if (!isStatementTimeout(error)) {
        log.error('Error fetching likes', { component: 'useLikes', action: 'fetch-likes' }, error)
      }
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

      // Don't use .maybeSingle(): legacy duplicate like rows (same user+target)
      // make it throw PGRST116 ("multiple rows"). We only care whether ≥1 row
      // exists, so fetch one and check presence. A unique index now prevents
      // new duplicates (see migration 58).
      const { data, error } = await query.limit(1)

      if (error) throw error
      setIsLiked((data?.length ?? 0) > 0)
    } catch (error) {
      // Expected timeout → degrade to "not liked" without reporting.
      if (isStatementTimeout(error)) {
        setIsLiked(false)
      } else {
        log.error('Error checking if liked', { component: 'useLikes', action: 'check-liked' }, error)
      }
    }
  }, [user, albumId, photoId, storyId])

  // Fetch likes and check if liked only when IDs change or user changes
  useEffect(() => {
    if (albumId || photoId || storyId) {
      if (fetchList) {
        fetchLikes()
      }
      if (user) {
        checkIfLiked()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, photoId, storyId, user?.id, fetchList]) // Only depend on user.id, not the whole user object or functions

  // Set up real-time subscription for likes
  useEffect(() => {
    if (!subscribe || (!albumId && !photoId && !storyId)) return

    const supabase = createClient()
    const targetId = (albumId || photoId || storyId) as string
    const targetType = albumId ? 'album' : photoId ? 'photo' : 'story'

    // Topic must be unique PER HOOK INSTANCE: realtime-js leaves open topics
    // on subscribe, so a shared `likes_channel_${targetId}` topic means the
    // second mount (album page + photo gallery both subscribe) silently kills
    // the first one's channel.
    const channel = supabase
      .channel(`likes_channel_${targetId}_${Math.random().toString(36).slice(2, 9)}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          // WHY: Supabase Realtime supports exactly ONE filter expression —
          // a comma-joined "target_type=eq.x,target_id=eq.y" string matches
          // nothing, so no events were ever delivered. Filter on target_id
          // only and guard target_type inside the handler instead.
          filter: `target_id=eq.${targetId}`
        },
        (payload) => {
          log.info('Real-time like update received', {
            event: payload.eventType,
            targetId
          })

          if (payload.eventType === 'INSERT') {
            const newLike = payload.new as Like
            // target_type guard replaces the second (unsupported) server-side filter.
            if (newLike.target_type !== targetType) return
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
            // WHY: with the table's default REPLICA IDENTITY, payload.old only
            // contains the primary key — user_id/target_type are absent, so a
            // surgical "remove by user_id" can never match. Drop the row by id
            // if we know it, then refetch to reconcile count and liked state.
            const deletedLike = payload.old as { id?: string }
            if (deletedLike.id) {
              setLikes(prev => prev.filter(like => like.id !== deletedLike.id))
            }
            if (fetchList) {
              fetchLikes()
            }
            if (user) {
              checkIfLiked()
            }
          }
        }
      )
      .subscribe((status, err) => {
        // WHY: a silently failed subscription looks identical to "no likes yet";
        // surface channel failures so broken live updates are diagnosable.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          log.error(
            'Likes realtime subscription failed',
            { component: 'useLikes', action: 'subscribe', targetId, status },
            err
          )
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- user?.id is sufficient; full user object would cause unnecessary re-subscriptions
  }, [albumId, photoId, storyId, user?.id, subscribe, fetchList])

  // WHY: guards toggleLike against overlapping calls. A rapid double-tap used
  // to fire two INSERTs — the second hit the unique index and its error path
  // reverted the UI to "unliked" while the DB row existed, leaving the heart
  // permanently out of sync (every later tap re-INSERTed and re-failed).
  const toggleInFlightRef = useRef(false)

  /**
   * Toggles the like and resolves to the *settled* liked state (what the UI
   * ends up showing after any error revert/reconcile). Callers that mirror
   * the count elsewhere (e.g. the feed footer) can compare this against their
   * optimistic guess and correct themselves.
   */
  const toggleLike = useCallback(async (): Promise<boolean> => {
    if (!user) return isLiked
    // Ignore taps while a toggle is still pending — see toggleInFlightRef.
    if (toggleInFlightRef.current) return isLiked
    toggleInFlightRef.current = true

    // Optimistic update - update UI immediately for instant feedback
    const previousIsLiked = isLiked
    const previousLikes = likes

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
      return !previousIsLiked
    } catch (error) {
      // WHY: a 23505 unique violation on INSERT means the like already exists
      // server-side (racing tap, other tab). The optimistic "liked" state is
      // therefore CORRECT — reverting it would desync the UI from the DB.
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code)
          : ''
      if (!previousIsLiked && code === '23505') {
        setIsLiked(true)
        log.info('Like insert hit unique constraint; reconciled to liked', {
          albumId,
          photoId,
          storyId,
          userId: user.id
        })
        return true
      }

      // Revert optimistic update on error
      setIsLiked(previousIsLiked)
      // Restore previous likes array
      setLikes(previousLikes)
      log.error('Error toggling like', { albumId, photoId, storyId }, error)
      return previousIsLiked
    } finally {
      toggleInFlightRef.current = false
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

  // Set up real-time subscription for comments
  useEffect(() => {
    if (!albumId && !photoId) return

    const supabase = createClient()
    const targetId = (albumId || photoId) as string
    const targetType = albumId ? 'album' : 'photo'

    // Unique per instance — same _leaveOpenTopic rationale as the likes channel.
    const channel = supabase
      .channel(`comments_channel_${targetId}_${Math.random().toString(36).slice(2, 9)}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          // WHY: Supabase Realtime supports exactly ONE filter expression —
          // the previous comma-joined string matched nothing, so comments
          // never live-updated. Filter on target_id only and guard
          // target_type inside the handler.
          filter: `target_id=eq.${targetId}`
        },
        (payload) => {
          log.info('Real-time comment update received', {
            event: payload.eventType,
            targetId
          })

          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as { id: string; target_type?: string }
            // target_type guard replaces the second (unsupported) server-side filter.
            if (inserted.target_type !== targetType) return
            // Fetch ONLY the new comment (with joined user data) and append it,
            // instead of refetching the entire list. Dedupe so our own
            // optimistic insert isn't duplicated.
            void (async () => {
              const { data } = await supabase
                .from('comments')
                .select(`
                  id,
                  content,
                  user_id,
                  target_type,
                  target_id,
                  created_at,
                  updated_at,
                  users!comments_user_id_fkey(
                    id,
                    username,
                    display_name,
                    avatar_url
                  )
                `)
                .eq('id', inserted.id)
                .single()

              if (!data) return
              const newComment = {
                ...data,
                users: Array.isArray(data.users) ? data.users[0] : data.users
              } as Comment
              setComments(prev =>
                prev.some(c => c.id === newComment.id) ? prev : [...prev, newComment]
              )
            })()
          } else if (payload.eventType === 'DELETE') {
            // Deleting by primary key is safe without a target_type guard
            // (ids are globally unique; a foreign id simply won't match).
            const deletedComment = payload.old as { id: string }
            setComments(prev => prev.filter(comment => comment.id !== deletedComment.id))
          }
        }
      )
      .subscribe((status, err) => {
        // WHY: a silently failed subscription looks identical to "no new
        // comments"; surface channel failures so they are diagnosable.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          log.error(
            'Comments realtime subscription failed',
            { component: 'useComments', action: 'subscribe', targetId, status },
            err
          )
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [albumId, photoId])

  const addComment = async (text: string): Promise<Comment | null> => {
    if (!user || !text.trim() || loading) return null

    setLoading(true)
    const supabase = createClient()
    try {
      const commentData: { content: string; user_id: string; target_type: 'photo' | 'album'; target_id: string } = {
        content: text.trim(),
        user_id: user.id,
        target_type: albumId ? 'album' : 'photo',
        target_id: (albumId || photoId) as string
      }

      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select(`
          id,
          content,
          user_id,
          target_type,
          target_id,
          created_at,
          updated_at,
          users!comments_user_id_fkey(
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Optimistically add the comment to the UI immediately
      if (data) {
        const newComment = {
          ...data,
          users: Array.isArray(data.users) ? data.users[0] : data.users
        } as Comment
        setComments(prev => [...prev, newComment])
        return newComment
      }

      return null
    } catch (error) {
      log.error('Error adding comment', {}, error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!user) return

    const supabase = createClient()

    // Optimistic removal: drop it from the list immediately (no global loading
    // flag, so deleting one comment doesn't block deleting another), and
    // restore it if the server rejects the delete.
    const removed = comments.find(c => c.id === commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id) // Only allow users to delete their own comments

      if (error) throw error
    } catch (error) {
      // Roll back: re-insert the comment in chronological order.
      if (removed) {
        setComments(prev =>
          [...prev, removed].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        )
      }
      log.error('Error deleting comment', {}, error)
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