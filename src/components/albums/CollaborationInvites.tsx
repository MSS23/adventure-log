'use client'

import { useState } from 'react'
import { useCollaborationInvites } from '@/lib/hooks/useCollaborativeAlbum'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Check, X, MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { toast } from 'sonner'
import { log } from '@/lib/utils/logger'
import Link from 'next/link'
import Image from 'next/image'

interface CollaborationInvitesProps {
  className?: string
}

export function CollaborationInvites({ className }: CollaborationInvitesProps) {
  const { invites, loading, respondToInvite } = useCollaborationInvites()
  const [responding, setResponding] = useState<string | null>(null)

  const handleRespond = async (collaboratorId: string, accept: boolean) => {
    setResponding(collaboratorId)
    try {
      await respondToInvite(collaboratorId, accept)
      toast.success(accept ? 'Invitation accepted!' : 'Invitation declined')
    } catch (err) {
      toast.error('Failed to respond to invitation')
      log.error(
        'Error responding to collaboration invite',
        { component: 'CollaborationInvites', action: accept ? 'accept' : 'decline' },
        err as Error
      )
    } finally {
      setResponding(null)
    }
  }

  if (loading) return null
  if (invites.length === 0) return null

  return (
    <Card className={cn('dark:bg-stone-900 dark:border-stone-800', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-olive-600 dark:text-olive-400" />
          Album Invitations
          <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-400 text-xs font-medium">
            {invites.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invites.map((invite) => {
          const inviter = invite.user
          const album = invite.album
          const coverUrl = getPhotoUrl(album?.cover_photo_url)

          return (
            <div
              key={invite.id}
              className={cn(
                'flex gap-3 p-3 rounded-lg',
                'bg-stone-50 dark:bg-stone-800/50',
                'border border-stone-100 dark:border-stone-700/50'
              )}
            >
              {/* Album cover thumbnail */}
              <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-stone-200 dark:bg-stone-700 relative">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={album?.title || 'Album'}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-stone-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/albums/${album?.id}`}
                      className="text-sm font-semibold text-stone-800 dark:text-stone-200 hover:text-olive-600 dark:hover:text-olive-400 transition-colors truncate block"
                    >
                      {album?.title || 'Untitled Album'}
                    </Link>
                    {album?.location_name && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{album.location_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Inviter info */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={getPhotoUrl(inviter?.avatar_url) || undefined} />
                    <AvatarFallback className="text-[6px] bg-stone-200 dark:bg-stone-700">
                      {inviter?.display_name?.[0] || inviter?.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    Invited by{' '}
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {inviter?.display_name || inviter?.username || 'someone'}
                    </span>
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 bg-olive-600 hover:bg-olive-700 dark:bg-olive-700 dark:hover:bg-olive-600"
                    disabled={responding === invite.id}
                    onClick={() => handleRespond(invite.id, true)}
                  >
                    {responding === invite.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={responding === invite.id}
                    onClick={() => handleRespond(invite.id, false)}
                  >
                    <X className="h-3 w-3" />
                    Decline
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
