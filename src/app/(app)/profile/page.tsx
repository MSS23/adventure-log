'use client'

// Client-only profile page.
//
// Previously a Server Component that pre-fetched profile/albums/stats with the
// Supabase server client (cookies()/getUser()). That can't be statically
// exported, so the whole page was omitted from the Capacitor mobile bundle —
// which broke the "You" tab on device. ProfileContent already fetches all of
// its own data client-side (see fetchUserData), so the page just hands it the
// signed-in user + profile from the auth context and lets it load. Web
// behaviour is preserved: same component, data now arrives a beat later behind
// the existing loading shimmer instead of during SSR (the page is auth-gated,
// so there's no SEO cost).

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import ProfileContent from './ProfileContent'

export default function ProfilePage() {
  const { user, profile, authLoading, profileLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  if (authLoading || profileLoading || !user || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <ProfileContent
      profile={profile}
      userId={user.id}
      initialAlbums={[]}
      initialFollowStats={{ followersCount: 0, followingCount: 0 }}
      initialCountryCodes={[]}
      initialTravelStats={{ countries: 0, cities: 0, photos: 0 }}
    />
  )
}
