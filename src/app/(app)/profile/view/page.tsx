'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserProfileView } from '@/components/profile/UserProfileView'

/**
 * Static twin of /profile/[userId] (and /u/[username]) for the Capacitor
 * bundle. NativeNavigationAdapter rewrites profile links here on native.
 */
function ProfileViewInner() {
  const searchParams = useSearchParams()
  const u = searchParams.get('u')

  if (!u) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <p className="text-foreground font-medium">Profile not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link is missing a user.</p>
        <Link href="/feed" className="mt-4">
          <Button variant="outline">Back to Feed</Button>
        </Link>
      </div>
    )
  }

  return <UserProfileView userIdOrUsername={u} />
}

export default function ProfileViewPage() {
  return (
    <Suspense fallback={null}>
      <ProfileViewInner />
    </Suspense>
  )
}
