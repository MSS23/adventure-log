'use client'

import Link from 'next/link'
import { AlertCircle, ArrowRight, Loader2, Lock, UserCheck, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/AuthProvider'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayInitial, getDisplayName } from '@/lib/utils/display-name'
import { usePassportConnect } from './usePassportConnect'

interface PrivatePassportConnectProps {
  owner: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  }
  qrToken?: string | null
  shouldConnect: boolean
}

/**
 * Minimal landing surface for a scanned private passport. It completes the
 * consented connection without exposing the owner's albums or travel stats.
 */
export function PrivatePassportConnect({
  owner,
  qrToken,
  shouldConnect,
}: PrivatePassportConnectProps) {
  const { user } = useAuth()
  const displayName = getDisplayName(owner.display_name, owner.username)
  const isSignedInViewer = !!user && user.id !== owner.id
  const { status, mutualPending, errorMessage, retry } = usePassportConnect({
    targetUserId: owner.id,
    qrToken,
    enabled: shouldConnect && isSignedInViewer,
  })

  const icon = status === 'connected'
    ? <UserCheck className="size-6" aria-hidden />
    : status === 'pending' || status === 'following'
      ? <Users className="size-6" aria-hidden />
      : status === 'error'
        ? <AlertCircle className="size-6" aria-hidden />
        : status === 'connecting'
          ? <Loader2 className="size-6 animate-spin" aria-hidden />
          : <Lock className="size-6" aria-hidden />

  let title = 'Private passport'
  let body = `${displayName}'s travel history is private.`
  if (status === 'connecting') {
    title = 'Connecting passports…'
    body = 'Keep this screen open for a moment.'
  } else if (status === 'connected') {
    title = mutualPending ? `You now follow ${displayName}` : 'Passports connected'
    body = mutualPending
      ? 'Approve their follow request to unlock your shared Travel Blend.'
      : `You and ${displayName} can now compare your globes in Travel Blend.`
  } else if (status === 'pending') {
    title = 'Follow request sent'
    body = `${displayName} will need to approve it before their travels are visible.`
  } else if (status === 'following') {
    title = `You follow ${displayName}`
    body = 'Their private travel history stays hidden until they follow you back.'
  } else if (status === 'error') {
    title = 'Couldn’t connect passports'
    body = errorMessage || 'Ask the passport owner to refresh their QR code, then try again.'
  } else if (shouldConnect && !user) {
    body = 'Sign in to connect, while keeping their travel history private.'
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center shadow-xl">
        <Avatar className="mx-auto mb-4 size-20 ring-2 ring-background shadow">
          <AvatarImage src={getAvatarUrl(owner.avatar_url, owner.username)} alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
            {getDisplayInitial(owner.display_name, owner.username)}
          </AvatarFallback>
        </Avatar>

        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        <p className="al-eyebrow mb-1">@{owner.username}</p>
        <h1 className="al-display text-2xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground" aria-live="polite">
          {body}
        </p>

        <div className="mt-6 space-y-3">
          {status === 'connected' && (
            <Button asChild className="w-full gap-2">
              <Link href={mutualPending ? '/followers' : `/blend/${owner.username}`}>
                {mutualPending ? 'Review follow request' : 'Compare your globes'}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          )}
          {status === 'error' && (
            <Button type="button" onClick={() => void retry()} className="w-full">
              Try again
            </Button>
          )}
          {shouldConnect && !user && (
            <Button asChild className="w-full">
              <Link href={`/login?redirectTo=${encodeURIComponent(`/u/${owner.username}/passport?connect=true${qrToken ? `&t=${encodeURIComponent(qrToken)}` : ''}`)}`}>
                Sign in to connect
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/u/${owner.username}`}>View profile</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
