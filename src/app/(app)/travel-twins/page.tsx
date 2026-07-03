'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, Users, MapPin, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FollowButton } from '@/components/social/FollowButton'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'

interface Twin {
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  overlap_count: number
  their_country_count: number
  my_country_count: number
  privacy_level: string | null
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
  // null = no explicit user choice yet; we fall back to the first twin below so
  // the default-select-first behavior is preserved without an effect.
  const [manualTwinId, setManualTwinId] = useState<string | null>(null)

  const { data: twins = [], isPending } = useQuery<Twin[]>({
    queryKey: ['travel-twins', user?.id],
    enabled: !!user,
    // The original fetch had no retry and fell through to the empty state on
    // failure; preserve that immediate behavior.
    retry: false,
    queryFn: async () => {
      try {
        const res = await apiFetch('/api/travel-twins')
        const data = await res.json()
        if (res.ok) return (data.twins || []) as Twin[]
        return []
      } catch (error) {
        log.error('Load twins failed', { component: 'TravelTwinsPage' }, error as Error)
        throw error
      }
    },
  })

  // Effective selection: the user's explicit pick if it still exists in the
  // list, otherwise the first twin (matches the old "select first on load").
  const selectedTwinId =
    (manualTwinId && twins.some((t) => t.user_id === manualTwinId) ? manualTwinId : null) ??
    twins[0]?.user_id ??
    null
  const setSelectedTwinId = setManualTwinId

  // Loading the twins list only matters once auth is resolved.
  const loading = !!user && isPending

  const { data: recommendations = [], isFetching: loadingRecs } = useQuery<Recommendation[]>({
    queryKey: ['travel-twins-recommendations', selectedTwinId],
    enabled: !!selectedTwinId,
    retry: false,
    queryFn: async () => {
      try {
        const res = await apiFetch(`/api/travel-twins/${selectedTwinId}/recommendations`)
        const data = await res.json()
        if (res.ok) return (data.recommendations || []) as Recommendation[]
        return []
      } catch (error) {
        log.error('Load recommendations failed', { component: 'TravelTwinsPage' }, error as Error)
        throw error
      }
    },
  })

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <PageHeader
        className="mb-8"
        title="Travel Twins"
        subtitle="Travelers whose destinations overlap with yours. Discover the places they’ve been that you haven’t."
      />

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
            Create albums with location data, or wait for more travelers to match your footprint.
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
                  type="button"
                  key={twin.user_id}
                  onClick={() => setSelectedTwinId(twin.user_id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-colors duration-200 cursor-pointer active:scale-[0.99]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isSelected
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-border bg-card hover:bg-muted/60'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getAvatarUrl(twin.avatar_url, twin.username)} />
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {getDisplayInitial(twin.display_name, twin.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {getDisplayName(twin.display_name, twin.username)}
                        </span>
                        {twin.privacy_level === 'private' && (
                          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private account" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {overlapPct}% match
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
                        <AvatarImage src={getAvatarUrl(twin.avatar_url, twin.username)} />
                        <AvatarFallback className="bg-accent text-accent-foreground">
                          {getDisplayInitial(twin.display_name, twin.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/profile/${twin.username}`}
                            className="font-heading font-semibold text-lg text-foreground hover:text-accent transition-colors"
                          >
                            {getDisplayName(twin.display_name, twin.username)}
                          </Link>
                          {twin.privacy_level === 'private' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <Lock className="h-2.5 w-2.5" /> Private
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          You share a lot of ground — here&apos;s where your journeys overlap.
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
              twins.find((t) => t.user_id === selectedTwinId)?.privacy_level === 'private' ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lock className="h-5 w-5" />
                  </div>
                  <p className="font-heading text-sm font-semibold text-foreground">This traveler is private</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Follow them and wait for approval to see the places they&apos;ve been.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6">No new places to suggest right now.</p>
              )
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
