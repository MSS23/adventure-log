'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  MapPin,
  Globe,
  Camera,
  Edit,
  Settings,
  Image as ImageIcon,
  Users,
  UserPlus,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { useUserLevels } from '@/lib/hooks/useUserLevels'
import { useFollows } from '@/lib/hooks/useFollows'
import { MissingLocationNotification } from '@/components/notifications/MissingLocationNotification'
import { ProfileCompletionPrompt } from '@/components/onboarding/ProfileCompletionPrompt'
import { FirstAlbumPrompt } from '@/components/onboarding/FirstAlbumPrompt'
import dynamic from 'next/dynamic'

const MonthlyHighlights = dynamic(
  () => import('@/components/dashboard/MonthlyHighlights').then(mod => ({ default: mod.MonthlyHighlights })),
  {
    loading: () => <div className="animate-pulse bg-stone-100 dark:bg-stone-900 rounded-2xl h-64" />,
    ssr: false
  }
)

interface RecentAlbum {
  id: string
  title: string
  cover_photo_url?: string
  created_at: string
  status?: string
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { currentLevel, currentTitle, getLevelBadgeColor } = useUserLevels()
  const { stats: followStats } = useFollows()
  const [stats, setStats] = useState({
    albums: 0,
    photos: 0,
    countries: 0,
    cities: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentAlbums, setRecentAlbums] = useState<RecentAlbum[]>([])
  const [avatarKey, setAvatarKey] = useState(Date.now())
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    const supabase = createClient()
    try {
      setLoading(true)
      setError(null)

      const [albumsResult, photosResult, recentAlbumsResult] = await Promise.all([
        supabase
          .from('albums')
          .select('id, country_code, location_name, latitude, longitude, status')
          .eq('user_id', user?.id),
        supabase
          .from('photos')
          .select('id')
          .eq('user_id', user?.id),
        supabase
          .from('albums')
          .select('id, title, cover_photo_url, created_at, status')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(6)
      ])

      if (albumsResult.error) throw new Error('Failed to fetch albums')
      if (photosResult.error) throw new Error('Failed to fetch photos')
      if (recentAlbumsResult.error) throw new Error('Failed to fetch recent albums')

      const albums = (albumsResult.data || []).filter(a => a.status !== 'draft')
      const albumsWithLocation = albums.filter(a => a.latitude && a.longitude)

      const uniqueCountries = new Set(
        albumsWithLocation
          .filter(a => a.country_code || a.location_name)
          .map(a => {
            if (a.country_code) return a.country_code
            if (a.location_name) {
              const parts = a.location_name.split(',').map((p: string) => p.trim())
              return parts[parts.length - 1] || ''
            }
            return ''
          })
          .filter(country => country.length > 0)
      )

      const uniqueCities = new Set(
        albumsWithLocation
          .filter(a => a.location_name)
          .map(a => {
            const parts = a.location_name.split(',').map((p: string) => p.trim())
            return parts[0] || a.location_name
          })
      )

      setStats({
        albums: albums.length,
        photos: photosResult.data?.length || 0,
        countries: uniqueCountries.size,
        cities: uniqueCities.size
      })

      const recentAlbumsFiltered = (recentAlbumsResult.data || []).filter(a => a.status !== 'draft')

      log.info('Recent albums fetched', {
        component: 'DashboardPage',
        count: recentAlbumsFiltered.length,
        total: recentAlbumsResult.data?.length || 0
      })

      setRecentAlbums(recentAlbumsFiltered)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data'
      setError(errorMessage)
      log.error('Error fetching profile stats', { component: 'DashboardPage', userId: user?.id }, err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user, fetchStats])

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarKey(Date.now())
    }
  }, [profile?.avatar_url])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-olive-50/50 dark:bg-olive-950/20 border border-olive-200/50 dark:border-olive-800/30 rounded-2xl p-8 text-center">
          <p className="text-olive-700 dark:text-olive-300 font-medium">Profile not found</p>
          <p className="text-olive-600/70 dark:text-olive-400/70 text-sm mt-1">Please complete your profile setup</p>
          <Link href="/setup" className="mt-5 inline-block">
            <Button>Complete Profile Setup</Button>
          </Link>
        </div>
      </div>
    )
  }

  const statItems = [
    { label: 'Albums', value: stats.albums, icon: Camera, href: '/albums', color: 'text-olive-600 dark:text-olive-400' },
    { label: 'Photos', value: stats.photos, icon: ImageIcon, href: '/albums', color: 'text-olive-600 dark:text-olive-400' },
    { label: 'Countries', value: stats.countries, icon: Globe, href: '/globe', color: 'text-olive-600 dark:text-olive-400' },
    { label: 'Cities', value: stats.cities, icon: MapPin, href: '/analytics', color: 'text-olive-600 dark:text-olive-400' },
    { label: 'Followers', value: followStats.followersCount, icon: Users, href: '/followers', color: 'text-rose-500 dark:text-rose-400' },
    { label: 'Following', value: followStats.followingCount, icon: UserPlus, href: '/following', color: 'text-olive-600 dark:text-olive-400' },
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Profile Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/50 dark:border-white/[0.06]">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="relative px-6 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-stone-100 dark:ring-white/[0.08] ring-offset-2 ring-offset-white dark:ring-offset-[#111111]">
                <AvatarImage
                  key={avatarKey}
                  src={profile.avatar_url ? `${profile.avatar_url}?t=${avatarKey}` : ''}
                  alt={profile.display_name || profile.username}
                />
                <AvatarFallback className="text-xl font-semibold bg-olive-100 text-olive-700 dark:bg-olive-900/30 dark:text-olive-300">
                  {getInitials(profile.display_name || profile.username || '')}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h1 className="text-2xl sm:text-3xl tracking-tight">
                  {profile.display_name || profile.username}
                </h1>
                {profile.display_name && profile.username && (
                  <p className="text-stone-400 dark:text-stone-500 text-sm mt-0.5">@{profile.username}</p>
                )}
              </div>

              {profile.bio && (
                <p className="text-stone-600 dark:text-stone-400 text-sm leading-relaxed max-w-lg">{profile.bio}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {profile.location && (
                  <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.location}
                  </span>
                )}
                <Badge className={`text-[11px] font-medium ${getLevelBadgeColor(currentLevel)}`}>
                  Lv. {currentLevel} · {currentTitle}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Link href="/profile/edit" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="w-full">
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
              <Link href="/settings" className="flex-1 sm:flex-none">
                <Button variant="ghost" size="sm" className="w-full">
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {statItems.map((item) => (
          <Link key={item.label} href={item.href}>
            <div className="group relative bg-white dark:bg-[#111111] rounded-xl border border-stone-200/50 dark:border-white/[0.06] px-3 py-4 text-center hover:border-olive-300/50 dark:hover:border-olive-700/30 transition-all duration-200 hover:shadow-sm">
              <item.icon className={`h-5 w-5 mx-auto mb-2 ${item.color} transition-transform duration-200 group-hover:scale-110`} strokeWidth={1.7} />
              <div className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                {loading ? <span className="inline-block w-6 h-5 bg-stone-100 dark:bg-stone-800 rounded animate-pulse" /> : item.value}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-500 font-medium mt-0.5">{item.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 rounded-xl px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="text-red-600 dark:text-red-400 flex-1">
              <p className="font-medium text-sm">Failed to load profile data</p>
              <p className="text-xs mt-0.5 opacity-70">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchStats()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Onboarding Prompts */}
      <ProfileCompletionPrompt profile={profile} />
      <FirstAlbumPrompt hasAlbums={stats.albums > 0} />
      <MissingLocationNotification />

      {/* Monthly Highlights */}
      {!loading && <MonthlyHighlights />}

      {/* Recent Albums */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl tracking-tight">Recent Albums</h2>
          <Link href="/albums" className="group flex items-center gap-1 text-sm text-stone-500 hover:text-olive-600 dark:hover:text-olive-400 transition-colors">
            View all
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] bg-stone-100 dark:bg-stone-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentAlbums.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recentAlbums.map((album) => {
              const coverPhotoUrl = album.cover_photo_url ? getPhotoUrl(album.cover_photo_url) : null

              return (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <div className="group relative aspect-[4/3] bg-stone-100 dark:bg-stone-900 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                    {coverPhotoUrl ? (
                      <Image
                        src={coverPhotoUrl}
                        alt={album.title}
                        fill
                        className="object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800">
                        <Camera className="h-10 w-10 text-stone-300 dark:text-stone-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="text-white font-semibold text-sm truncate drop-shadow-sm">{album.title}</h3>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111111] border border-stone-200/50 dark:border-white/[0.06] rounded-xl text-center py-14">
            <Camera className="h-10 w-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-4">No albums yet</p>
            <Link href="/albums/new">
              <Button>
                <Camera className="h-4 w-4 mr-2" />
                Create Your First Album
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
