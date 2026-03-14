'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'

export interface Collaborator {
  id: string
  album_id: string
  user_id: string
  role: 'contributor' | 'editor' | 'viewer'
  status: 'pending' | 'accepted' | 'declined'
  invited_by: string
  created_at: string
  accepted_at: string | null
  user?: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CollaborationInvite extends Collaborator {
  album?: {
    id: string
    title: string
    cover_photo_url: string | null
    location_name: string | null
  }
}

export function useCollaborativeAlbum(albumId: string | undefined) {
  const { user } = useAuth()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [isCollaborator, setIsCollaborator] = useState(false)
  const [myRole, setMyRole] = useState<string | null>(null)

  const supabase = createClient()

  const fetchCollaborators = useCallback(async () => {
    if (!albumId) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('album_collaborators')
        .select('*, user:user_id(id, username, display_name, avatar_url)')
        .eq('album_id', albumId)

      if (error) {
        // Table might not exist yet - silently handle
        if (error.code === 'PGRST205' || error.code === '42P01') {
          setLoading(false)
          return
        }
        throw error
      }

      setCollaborators(data || [])

      // Check if current user is a collaborator
      if (user) {
        const myCollab = (data || []).find(
          (c: Collaborator) => c.user_id === user.id && c.status === 'accepted'
        )
        setIsCollaborator(!!myCollab)
        setMyRole(myCollab?.role || null)
      }
    } catch (err) {
      log.error(
        'Error fetching collaborators',
        { component: 'useCollaborativeAlbum', albumId },
        err as Error
      )
    } finally {
      setLoading(false)
    }
  }, [albumId, user, supabase])

  useEffect(() => {
    fetchCollaborators()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumId, user?.id])

  const inviteCollaborator = useCallback(
    async (userId: string, role: 'contributor' | 'editor' | 'viewer' = 'contributor') => {
      if (!albumId || !user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('album_collaborators')
        .insert({
          album_id: albumId,
          user_id: userId,
          role,
          invited_by: user.id,
          status: 'pending',
        })
        .select('*, user:user_id(id, username, display_name, avatar_url)')
        .single()

      if (error) throw error
      setCollaborators((prev) => [...prev, data])
      return data
    },
    [albumId, user, supabase]
  )

  const removeCollaborator = useCallback(
    async (collaboratorId: string) => {
      const { error } = await supabase
        .from('album_collaborators')
        .delete()
        .eq('id', collaboratorId)

      if (error) throw error
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId))
    },
    [supabase]
  )

  const respondToInvite = useCallback(
    async (collaboratorId: string, accept: boolean) => {
      const { error } = await supabase
        .from('album_collaborators')
        .update({
          status: accept ? 'accepted' : 'declined',
          accepted_at: accept ? new Date().toISOString() : null,
        })
        .eq('id', collaboratorId)

      if (error) throw error
      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === collaboratorId
            ? {
                ...c,
                status: accept ? ('accepted' as const) : ('declined' as const),
                accepted_at: accept ? new Date().toISOString() : null,
              }
            : c
        )
      )
    },
    [supabase]
  )

  return {
    collaborators,
    loading,
    isCollaborator,
    myRole,
    inviteCollaborator,
    removeCollaborator,
    respondToInvite,
    refetch: fetchCollaborators,
  }
}

// Hook to get pending invites for the current user
export function useCollaborationInvites() {
  const { user } = useAuth()
  const [invites, setInvites] = useState<CollaborationInvite[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchInvites = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('album_collaborators')
        .select(`
          *,
          user:invited_by(id, username, display_name, avatar_url),
          album:album_id(id, title, cover_photo_url, location_name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') return
        throw error
      }
      setInvites(data || [])
    } catch (err) {
      log.error(
        'Error fetching collaboration invites',
        { component: 'useCollaborationInvites' },
        err as Error
      )
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchInvites()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const respondToInvite = useCallback(
    async (collaboratorId: string, accept: boolean) => {
      const { error } = await supabase
        .from('album_collaborators')
        .update({
          status: accept ? 'accepted' : 'declined',
          accepted_at: accept ? new Date().toISOString() : null,
        })
        .eq('id', collaboratorId)

      if (error) throw error
      setInvites((prev) => prev.filter((i) => i.id !== collaboratorId))
    },
    [supabase]
  )

  return { invites, loading, respondToInvite, refetch: fetchInvites }
}
