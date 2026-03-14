'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useCollaborativeAlbum } from '@/lib/hooks/useCollaborativeAlbum'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, UserPlus, X, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'
import { toast } from 'sonner'

interface FriendUser {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface CollaboratorManagerProps {
  albumId: string
  isOwner: boolean
}

export function CollaboratorManager({ albumId, isOwner }: CollaboratorManagerProps) {
  const { user } = useAuth()
  const { collaborators, loading, inviteCollaborator, removeCollaborator } =
    useCollaborativeAlbum(albumId)

  const [showInvite, setShowInvite] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [inviteRole, setInviteRole] = useState<'contributor' | 'editor' | 'viewer'>('contributor')
  const [inviting, setInviting] = useState<string | null>(null)

  const supabase = createClient()

  const fetchFriends = useCallback(async () => {
    if (!user) return
    setFriendsLoading(true)
    try {
      // Get users the current user follows (accepted)
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')

      if (error) throw error

      if (!data || data.length === 0) {
        setFriends([])
        return
      }

      const followingIds = data.map((f) => f.following_id)

      // Get user profiles for those followed users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', followingIds)

      if (usersError) throw usersError
      setFriends(usersData || [])
    } catch (err) {
      log.error(
        'Error fetching friends',
        { component: 'CollaboratorManager', action: 'fetchFriends' },
        err as Error
      )
    } finally {
      setFriendsLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    if (showInvite) {
      fetchFriends()
    }
  }, [showInvite, fetchFriends])

  const handleInvite = async (friendId: string) => {
    setInviting(friendId)
    try {
      await inviteCollaborator(friendId, inviteRole)
      toast.success('Invitation sent!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invite'
      if (message.includes('duplicate') || message.includes('unique')) {
        toast.error('User is already invited to this album')
      } else {
        toast.error(message)
      }
      log.error(
        'Error inviting collaborator',
        { component: 'CollaboratorManager', action: 'invite' },
        err as Error
      )
    } finally {
      setInviting(null)
    }
  }

  const handleRemove = async (collaboratorId: string) => {
    try {
      await removeCollaborator(collaboratorId)
      toast.success('Collaborator removed')
    } catch (err) {
      toast.error('Failed to remove collaborator')
      log.error(
        'Error removing collaborator',
        { component: 'CollaboratorManager', action: 'remove' },
        err as Error
      )
    }
  }

  // Filter friends based on search and already-invited users
  const alreadyInvitedIds = new Set(collaborators.map((c) => c.user_id))
  const filteredFriends = friends.filter((f) => {
    if (alreadyInvitedIds.has(f.id)) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      f.username?.toLowerCase().includes(query) ||
      f.display_name?.toLowerCase().includes(query)
    )
  })

  const alreadyInvitedFriends = friends.filter((f) => alreadyInvitedIds.has(f.id))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return (
          <Badge className="bg-olive-100 text-olive-700 dark:bg-olive-900/30 dark:text-olive-400 border-0 text-xs">
            Active
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
            Pending
          </Badge>
        )
      case 'declined':
        return (
          <Badge className="bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 border-0 text-xs">
            Declined
          </Badge>
        )
      default:
        return null
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'contributor':
        return 'Contributor'
      case 'editor':
        return 'Editor'
      case 'viewer':
        return 'Viewer'
      default:
        return role
    }
  }

  if (!isOwner && collaborators.length === 0) return null

  return (
    <Card className="dark:bg-stone-900 dark:border-stone-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Collaborators
          </div>
          {isOwner && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setShowInvite(!showInvite)}
            >
              <UserPlus className="h-4 w-4" />
              {showInvite ? 'Close' : 'Invite'}
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          {isOwner
            ? 'Invite friends to contribute photos to this album'
            : 'People contributing to this album'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite Panel */}
        {showInvite && isOwner && (
          <div className="space-y-3 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'contributor' | 'editor' | 'viewer')}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1">
              {friendsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
                </div>
              ) : filteredFriends.length === 0 && alreadyInvitedFriends.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">
                  {friends.length === 0
                    ? 'No friends found. Follow users to invite them.'
                    : 'No matching friends found.'}
                </p>
              ) : (
                <>
                  {/* Already invited (shown grayed out) */}
                  {alreadyInvitedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={getPhotoUrl(friend.avatar_url) || undefined} />
                          <AvatarFallback className="text-[10px] bg-stone-200 dark:bg-stone-700">
                            {friend.display_name?.[0] || friend.username?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-stone-600 dark:text-stone-400">
                          {friend.display_name || friend.username}
                        </span>
                      </div>
                      <span className="text-xs text-stone-400">Already invited</span>
                    </div>
                  ))}

                  {/* Available to invite */}
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={getPhotoUrl(friend.avatar_url) || undefined} />
                          <AvatarFallback className="text-[10px] bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-400">
                            {friend.display_name?.[0] || friend.username?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                            {friend.display_name || friend.username}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            @{friend.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={inviting === friend.id}
                        onClick={() => handleInvite(friend.id)}
                      >
                        {inviting === friend.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Invite'
                        )}
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* Collaborator List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-full bg-stone-200 dark:bg-stone-700" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-24" />
                  <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : collaborators.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">
            No collaborators yet. Invite friends to contribute!
          </p>
        ) : (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg',
                  'bg-white dark:bg-stone-800/50 border border-stone-100 dark:border-stone-700/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={getPhotoUrl(collab.user?.avatar_url) || undefined} />
                    <AvatarFallback className="bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-400 text-xs font-medium">
                      {collab.user?.display_name?.[0] || collab.user?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                      {collab.user?.display_name || collab.user?.username || 'Unknown'}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {getRoleLabel(collab.role)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(collab.status)}
                  {isOwner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-stone-400 hover:text-red-500"
                      onClick={() => handleRemove(collab.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
