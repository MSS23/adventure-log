'use client'

import { useParams } from 'next/navigation'
import { UserProfileView } from '@/components/profile/UserProfileView'

/**
 * Canonical web route for another user's profile (accepts UUID or username).
 * The body lives in UserProfileView so the static mobile bundle can serve the
 * same view at /profile/view?u=... (this dynamic route cannot be statically
 * exported — see scripts/mobile-build.mjs).
 */
export default function UserProfilePage() {
  const params = useParams()
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId
  return <UserProfileView userIdOrUsername={userId ?? ''} />
}
