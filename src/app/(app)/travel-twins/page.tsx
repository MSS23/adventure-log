'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Users, MapPin, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FollowButton } from '@/components/social/FollowButton'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { log } from '@/lib/utils/logger'
import { useAuth } from '@/components/auth/AuthProvider'

interface Twin {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  overlap_count: number
  their_country_count: number
  my_country_count: number
}

interface Recommendation {
  album_id: string
  title: string
  location_name: string | null
  country_code: string | null
  cover_photo_url: string | null
  date_start: string | null
}

export default function TravelTwinsPage() {
  const { user } = useAuth()
  const [twins, setTwins] = useState<Twin[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTwinId, setSelectedTwinId] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/travel-twins')
        const data = await res.json()
        if (res.ok) {
          setTwins(data.twins || [])
          if (data.twins?.[0]) setSelectedTwinId(data.twins[0].user_id)
        }
      } catch (error) {
        log.error('Load twins failed', { component: 'TravelTwinsPage' }, error as Error)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!selectedTwinId) return
    ;(async () => {
      try {
        setLoadingRecs(true)
        const res = await fetch(`/api/travel-twins/${selectedTwinId}/recommendations`)
        const data = await res.json()
        if (res.ok) setRecommendations(data.recommendations || [])
      } catch (error) {
        log.error('Load recommendations failed', { component: 'TravelTwinsPage' }, error as Error)
      } finally {
        setLoadingRecs(false)
      }
    })()
  }, [selectedTwinId])

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-olive-950 dark:text-olive-50 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-olive-600" />
          Travel Twins
        </h1>
        <p className="text-sm text-olive-600 dark:text-olive-400 mt-1">
          Travelers whose destinations overlap with yours. Discover places they&apos;ve been that you haven&apos;t.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
        </div>
      ) : twins.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-10 w-10 text-olive-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-olive-950 dark:text-olive-50 mb-2">
            No travel twins yet
          </h2>
          <p className="text-sm text-olive-600 dark:text-olive-400 max-w-md mx-auto">
            Create albums with location data, or wait for more public travelers to match your footprint.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-olive-600 dark:text-olive-400 mb-2">
              Your twins
            </h2>
            {twins.map((twin) => {
              const isSelected = twin.user_id === selectedTwinId
              const overlapPct = twin.my_country_count
                ? Math.round((twin.overlap_count / twin.my_country_count) * 100)
                : 0
              return (
                <button
                  key={twin.user_id}
                  onClick={() => setSelectedTwinId(twin.user_id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-olive-500 bg-olive-50 dark:bg-olive-950/30'
                      : 'border-stone-200 dark:border-white/10 hover:bg-stone-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={twin.avatar_url || undefined} />
                      <AvatarFallback>
                        {(twin.display_name || twin.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-olive-950 dark:text-olive-50 truncate">
                        {twin.display_name || twin.username}
                      </div>
                      <div className="text-xs text-olive-600 dark:text-olive-400">
                        {twin.overlap_count} shared • {overlapPct}% match
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="lg:col-span-2">
            {selectedTwinId &&
              (() => {
                const twin = twins.find((t) => t.user_id === selectedTwinId)
                if (!twin) return null
                return (
                  <Card className="p-5 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={twin.avatar_url || undefined} />
                        <AvatarFallback>
                          {(twin.display_name || twin.username)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Link
                          href={`/u/${twin.username}`}
                          className="font-semibold text-lg text-olive-950 dark:text-olive-50 hover:underline"
                        >
                          {twin.display_name || twin.username}
                        </Link>
                        <p className="text-sm text-olive-600 dark:text-olive-400">
                          You&apos;ve both been to {twin.overlap_count}{' '}
                          {twin.overlap_count === 1 ? 'country' : 'countries'} — they&apos;ve been to{' '}
                          {twin.their_country_count} total
                        </p>
                      </div>
                      <FollowButton userId={twin.user_id} />
                    </div>
                  </Card>
                )
              })()}

            <h3 className="text-sm font-semibold text-olive-950 dark:text-olive-50 mb-3">
              Places they&apos;ve been that you haven&apos;t
            </h3>

            {loadingRecs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-olive-600" />
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-olive-500 py-6">No new places to suggest right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.map((rec) => (
                  <Link key={rec.album_id} href={`/albums/${rec.album_id}`}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      {rec.cover_photo_url && (
                        <div className="relative aspect-[4/3] bg-stone-100 dark:bg-stone-800">
                          <Image
                            src={getPhotoUrl(rec.cover_photo_url) || ''}
                            alt={rec.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 50vw"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="font-medium text-sm text-olive-950 dark:text-olive-50 line-clamp-1">
                          {rec.title}
                        </div>
                        {rec.location_name && (
                          <div className="text-xs text-olive-600 dark:text-olive-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {rec.location_name}
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/explore">Explore more travelers</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
