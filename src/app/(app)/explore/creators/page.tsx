'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { FollowButton } from '@/components/social/FollowButton'
import { getAvatarUrl } from '@/lib/utils/avatar'

interface Creator {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  privacy_level: string
  albumCount?: number
  followerCount?: number
}

export default function CreatorsPage() {
  const { user } = useAuth()
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        // Fetch users with their album counts
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url, bio, privacy_level')
          .eq('privacy_level', 'public')
          .neq('id', user?.id || '')
          .order('created_at', { ascending: false })
          .limit(24)

        if (usersError) throw usersError

        // Fetch album counts for each user
        const usersWithCounts = await Promise.all(
          (usersData || []).map(async (creator) => {
            const [albumsResult, followersResult] = await Promise.all([
              supabase
                .from('albums')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', creator.id)
                .neq('status', 'draft'),
              supabase
                .from('follows')
                .select('id', { count: 'exact', head: true })
                .eq('following_id', creator.id)
                .eq('status', 'accepted')
            ])

            return {
              ...creator,
              albumCount: albumsResult.count || 0,
              followerCount: followersResult.count || 0
            }
          })
        )

        // Sort by album count
        usersWithCounts.sort((a, b) => (b.albumCount || 0) - (a.albumCount || 0))

        setCreators(usersWithCounts)
      } catch (error) {
        log.error('Error fetching creators', { component: 'CreatorsPage', action: 'fetch-creators' }, error as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchCreators()
  }, [user?.id, supabase])

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-ivory)' }}>
      {/* Header */}
      <header
        className="border-b border-[color:var(--color-line-warm)] sticky top-0 z-50 backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--card) 88%, transparent)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-coral)] transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Explore
            </Link>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" style={{ color: 'var(--color-forest)' }} />
              <h1 className="font-heading text-xl font-semibold text-[color:var(--color-ink)]">
                Creators to follow
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="rounded-2xl p-6 border border-[color:var(--color-line-warm)]" style={{ background: 'var(--card)' }}>
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-24 w-24 rounded-full animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
                  <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
                  <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
                  <div className="h-9 w-full rounded-full animate-pulse" style={{ background: 'var(--color-ivory-alt)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-forest-tint)' }}>
              <Users className="h-10 w-10" style={{ color: 'var(--color-forest)' }} />
            </div>
            <h3 className="font-heading text-lg font-semibold text-[color:var(--color-ink)] mb-2">No creators found</h3>
            <p className="text-[color:var(--color-ink-soft)]">
              Check back later for more travelers to follow
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-[color:var(--color-ink-soft)]">
                Discover {creators.length} travelers and their adventures
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="group rounded-2xl p-6 border border-[color:var(--color-line-warm)] hover:shadow-[0_18px_40px_-20px_rgba(26,20,14,0.25)] hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                  style={{ background: 'var(--card)' }}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <Link href={`/profile/${creator.username}`} className="cursor-pointer">
                      <Avatar
                        className="h-24 w-24 ring-2 transition-all duration-200 group-hover:scale-105"
                        style={{ '--tw-ring-color': 'var(--color-forest-tint)' } as React.CSSProperties}
                      >
                        <AvatarImage src={getAvatarUrl(creator.avatar_url, creator.username)} alt={creator.display_name} />
                        <AvatarFallback
                          className="text-2xl font-bold"
                          style={{ background: 'var(--color-forest-tint)', color: 'var(--color-forest)' }}
                        >
                          {creator.display_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="w-full min-h-[80px]">
                      <Link
                        href={`/profile/${creator.username}`}
                        className="font-heading font-semibold text-[color:var(--color-ink)] hover:text-[color:var(--color-forest)] transition-colors duration-200 line-clamp-1 block cursor-pointer rounded"
                      >
                        {creator.display_name}
                      </Link>
                      <p className="font-mono text-[11px] tracking-[0.04em] text-[color:var(--color-muted-warm)] mb-2">@{creator.username}</p>

                      {creator.bio ? (
                        <p className="text-sm text-[color:var(--color-ink-soft)] line-clamp-2">
                          {creator.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-[color:var(--color-muted-warm)] italic">
                          Adventure seeker
                        </p>
                      )}

                      <div className="flex items-center justify-center gap-3 mt-2 font-mono text-[11px] tracking-[0.04em] text-[color:var(--color-muted-warm)]">
                        <span>{creator.albumCount || 0} albums</span>
                        <span>·</span>
                        <span>{creator.followerCount || 0} followers</span>
                      </div>
                    </div>

                    <FollowButton
                      userId={creator.id}
                      size="sm"
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
