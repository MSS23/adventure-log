'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PublicPassportContent } from '@/components/passport/PublicPassportContent'
import { PrivatePassportConnect } from '@/components/passport/PrivatePassportConnect'
import { computeTravelStats } from '@/lib/utils/travel-stats'
import { log } from '@/lib/utils/logger'

/**
 * Static twin of /u/[username]/passport for the Capacitor bundle. This is the
 * landing page of the passport QR-scan flow (?u=<username>&connect=true), so
 * it must exist natively — the scanner runs in the app. Mirrors the server
 * page's queries with the client Supabase (public data only under RLS);
 * PublicPassportContent performs the auto-connect via apiFetch.
 */

type PassportUser = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  privacy_level: string | null
  created_at: string
}

function PassportViewInner() {
  const searchParams = useSearchParams()
  const username = searchParams.get('u')

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'not-found' }
    | { status: 'private'; user: PassportUser }
    | {
        status: 'ready'
        user: PassportUser
        props: Omit<Parameters<typeof PublicPassportContent>[0], 'user'>
      }
  >({ status: 'loading' })

  useEffect(() => {
    if (!username) return
    let cancelled = false
    const supabase = createClient()

    ;(async () => {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('id, username, display_name, bio, avatar_url, privacy_level, created_at')
          .ilike('username', username)
          .maybeSingle()

        if (!user) {
          if (!cancelled) setState({ status: 'not-found' })
          return
        }
        if (user.privacy_level === 'private') {
          if (!cancelled) setState({ status: 'private', user })
          return
        }

        const { data: albums } = await supabase
          .from('albums')
          .select('id, title, location_name, country_code, latitude, longitude, date_start, created_at, cover_photo_url')
          .eq('user_id', user.id)
          .eq('visibility', 'public')
          .neq('status', 'draft')
          .order('date_start', { ascending: true })

        const safeAlbums = albums || []

        let photoCount = 0
        const albumIds = safeAlbums.map((a) => a.id)
        if (albumIds.length > 0) {
          const { count } = await supabase
            .from('photos')
            .select('id', { count: 'exact', head: true })
            .in('album_id', albumIds)
          photoCount = count || 0
        }

        const { count: followerCount } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', user.id)
          .eq('status', 'accepted')

        const stats = computeTravelStats(safeAlbums)

        if (cancelled) return
        setState({
          status: 'ready',
          user,
          props: {
            countryCodes: stats.countryCodes,
            cities: stats.cities,
            totalAlbums: safeAlbums.length,
            totalPhotos: photoCount || 0,
            totalDistance: stats.totalDistanceKm,
            followerCount: followerCount || 0,
            continentsVisited: stats.continentsVisited,
            personality: stats.personality.type,
            firstTrip: stats.firstTrip
              ? {
                  title: stats.firstTrip.title,
                  location: stats.firstTrip.location_name ?? null,
                  date: stats.firstTrip.date_start || stats.firstTrip.created_at,
                  latitude: stats.firstTrip.latitude,
                }
              : null,
            latestTrip: stats.latestTrip
              ? {
                  title: stats.latestTrip.title,
                  location: stats.latestTrip.location_name ?? null,
                  date: stats.latestTrip.date_start || stats.latestTrip.created_at,
                  latitude: stats.latestTrip.latitude,
                }
              : null,
            memberSince: user.created_at,
          },
        })
      } catch (err) {
        log.error('Failed to load public passport', {
          component: 'PassportViewPage',
          action: 'load',
        }, err instanceof Error ? err : new Error(String(err)))
        if (!cancelled) setState({ status: 'not-found' })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [username])

  if (!username || state.status === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-1">
          <h1 className="al-display text-2xl md:text-3xl">Traveler not found</h1>
          <p className="text-sm text-muted-foreground">This passport doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  if (state.status === 'private') {
    if (searchParams.get('connect') === 'true') {
      return (
        <PrivatePassportConnect
          owner={state.user}
          qrToken={searchParams.get('t')}
          shouldConnect
        />
      )
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-1">
          <h1 className="al-display text-2xl md:text-3xl">Private Passport</h1>
          <p className="text-sm text-muted-foreground">This traveler&apos;s passport is private.</p>
        </div>
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return <PublicPassportContent user={state.user} {...state.props} />
}

export default function PassportViewPage() {
  return (
    <Suspense fallback={null}>
      <PassportViewInner />
    </Suspense>
  )
}
