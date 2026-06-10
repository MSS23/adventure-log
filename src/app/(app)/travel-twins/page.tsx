'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Users, MapPin } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FollowButton } from '@/components/social/FollowButton'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'
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
        const res = await apiFetch('/api/travel-twins')
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
        const res = await apiFetch(`/api/travel-twins/${selectedTwinId}/recommendations`)
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
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <header className="mb-8 space-y-1">
        <p className="al-eyebrow">Discover · Your Constellation</p>
        <h1 className="al-display text-3xl md:text-4xl">Travel Twins</h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Travelers whose destinations overlap with yours. Discover the places they&apos;ve been that you haven&apos;t.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : twins.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            No travel twins yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create albums with location data, or wait for more public travelers to match your footprint.
          </p>
          <Button asChild variant="coral" className="mt-5">
            <Link href="/explore">Explore travelers</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <p className="al-eyebrow mb-2">Your twins</p>
            {twins.map((twin) => {
              const isSelected = twin.user_id === selectedTwinId
              const overlapPct = twin.my_country_count
                ? Math.round((twin.overlap_count / twin.my_country_count) * 100)
                : 0
              return (
                <button
                  key={twin.user_id}
                  onClick={() => setSelectedTwinId(twin.user_id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-colors duration-200 cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-border bg-card hover:bg-muted/60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={twin.avatar_url || undefined} />
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {(twin.display_name || twin.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {twin.display_name || twin.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
                  <Card className="p-5 mb-4 gap-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={twin.avatar_url || undefined} />
                        <AvatarFallback className="bg-accent text-accent-foreground">
                          {(twin.display_name || twin.username)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/u/${twin.username}`}
                          className="font-heading font-semibold text-lg text-foreground hover:text-accent transition-colors"
                        >
                          {twin.display_name || twin.username}
                        </Link>
                        <p className="text-sm text-muted-foreground">
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

            <h3 className="font-heading text-sm font-semibold text-foreground mb-3">
              Places they&apos;ve been that you haven&apos;t
            </h3>

            {loadingRecs ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">No new places to suggest right now.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.map((rec) => (
                  <Link
                    key={rec.album_id}
                    href={`/albums/${rec.album_id}`}
                    className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card className="gap-0 overflow-hidden py-0 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5">
                      {rec.cover_photo_url && (
                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                          <Image
                            src={getPhotoUrl(rec.cover_photo_url) || ''}
                            alt={rec.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 50vw"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="font-medium text-sm text-foreground line-clamp-1">
                          {rec.title}
                        </div>
                        {rec.location_name && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
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
