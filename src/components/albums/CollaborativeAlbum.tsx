'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Users,
  UserPlus,
  X,
  Check,
  Mail,
  Crown,
  Camera,
  Send
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { useToast } from '@/components/ui/toast-provider'
import { useAuth } from '@/components/auth/AuthProvider'

interface Collaborator {
  id: string
  user_id: string
  album_id: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'pending' | 'accepted' | 'declined'
  user?: {
    username: string
    display_name: string
    avatar_url?: string
  }
}

interface CollaborativeAlbumProps {
  albumId: string
  albumTitle: string
  isOwner: boolean
  trigger?: React.ReactNode
}

export function CollaborativeAlbum({ albumId, albumTitle, isOwner, trigger }: CollaborativeAlbumProps) {
  const [open, setOpen] = useState(false)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      fetchCollaborators()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, albumId])

  const fetchCollaborators = async () => {
    try {
      setLoading(true)

      // Note: This would require a new table `album_collaborators`
      // For now, we'll simulate the structure
      const { data, error } = await supabase
        .from('album_collaborators')
        .select(`
          *,
          user:users(username, display_name, avatar_url)
        `)
        .eq('album_id', albumId)

      if (error) {
        // Table might not exist yet
        log.warn('Album collaborators table not found', {
          component: 'CollaborativeAlbum'
        })
        setCollaborators([])
        return
      }

      setCollaborators(data || [])
    } catch (err) {
      log.error('Failed to fetch collaborators', {
        component: 'CollaborativeAlbum'
      }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    try {
      setSending(true)

      // Find user by email or username
      const { data: invitedUser, error: userError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .or(`email.eq.${inviteEmail},username.eq.${inviteEmail}`)
        .single()

      if (userError || !invitedUser) {
        showError('User not found', 'No user found with that email or username')
        return
      }

      // Check if already a collaborator
      const existing = collaborators.find(c => c.user_id === invitedUser.id)
      if (existing) {
        showError('Already invited', 'This user is already a collaborator')
        return
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from('album_collaborators')
        .insert({
          album_id: albumId,
          user_id: invitedUser.id,
          role: 'editor',
          status: 'pending',
          invited_by: user?.id
        })

      if (inviteError) throw inviteError

      // TODO: Send notification to invited user

      success('Invitation sent', `Invited ${invitedUser.display_name} to collaborate`)
      setInviteEmail('')
      fetchCollaborators()
    } catch (err) {
      log.error('Failed to send invitation', {
        component: 'CollaborativeAlbum'
      }, err instanceof Error ? err : new Error(String(err)))
      showError('Invitation failed', 'Could not send invitation. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!confirm('Remove this collaborator?')) return

    try {
      const { error } = await supabase
        .from('album_collaborators')
        .delete()
        .eq('id', collaboratorId)

      if (error) throw error

      success('Collaborator removed', 'They can no longer edit this album')
      fetchCollaborators()
    } catch (err) {
      log.error('Failed to remove collaborator', {
        component: 'CollaborativeAlbum'
      }, err instanceof Error ? err : new Error(String(err)))
      showError('Remove failed', 'Could not remove collaborator')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" />Owner</Badge>
      case 'editor':
        return <Badge variant="secondary" className="gap-1"><Camera className="h-3 w-3" />Editor</Badge>
      case 'viewer':
        return <Badge variant="outline">Viewer</Badge>
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="default" className="bg-green-600"><Check className="h-3 w-3 mr-1" />Active</Badge>
      case 'pending':
        return <Badge variant="secondary" className="text-orange-600"><Mail className="h-3 w-3 mr-1" />Pending</Badge>
      case 'declined':
        return <Badge variant="outline" className="text-red-600"><X className="h-3 w-3 mr-1" />Declined</Badge>
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Users className="h-4 w-4" />
            Collaborators
            {collaborators.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {collaborators.filter(c => c.status === 'accepted').length}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Collaborators
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Invite friends to add photos to &quot;{albumTitle}&quot;
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite Section - Only for owners */}
          {isOwner && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Invite Collaborators
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email or username..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                  disabled={sending}
                />
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || sending}
                  className="gap-2 flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending...' : 'Invite'}
                </Button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Collaborators can add and edit photos in this album
              </p>
            </div>
          )}

          {/* Collaborators List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Current Collaborators ({collaborators.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-pulse" />
                <p className="text-sm">Loading collaborators...</p>
              </div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No collaborators yet</p>
                <p className="text-sm mt-1">Invite friends to collaborate on this album</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={collab.user?.avatar_url} />
                        <AvatarFallback>
                          {collab.user?.display_name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {collab.user?.display_name}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          @{collab.user?.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getRoleBadge(collab.role)}
                      {getStatusBadge(collab.status)}
                      {isOwner && collab.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCollaborator(collab.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 text-sm">Collaboration Roles</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <Crown className="h-3 w-3 text-yellow-600" />
                <span><strong>Owner:</strong> Full control, can manage collaborators</span>
              </li>
              <li className="flex items-center gap-2">
                <Camera className="h-3 w-3 text-blue-600" />
                <span><strong>Editor:</strong> Can add, edit, and delete photos</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="h-3 w-3 text-gray-600" />
                <span><strong>Viewer:</strong> Can only view photos</span>
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
