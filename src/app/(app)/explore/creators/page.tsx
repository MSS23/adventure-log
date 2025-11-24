'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
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
        console.error('Error fetching creators:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCreators()
  }, [user?.id, supabase])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link href="/explore">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Explore
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                Creators to Follow
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
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-24 w-24 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-9 w-full bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No creators found</h3>
            <p className="text-gray-600">
              Check back later for more travelers to follow
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Discover {creators.length} amazing travelers and their adventures
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-teal-500 transition-all"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <Link href={`/profile/${creator.username}`}>
                      <Avatar className="h-24 w-24 border-2 border-gray-100 hover:border-teal-400 transition-colors">
                        <AvatarImage src={getAvatarUrl(creator.avatar_url, creator.username)} alt={creator.display_name} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-100 to-cyan-100 text-teal-700 text-2xl font-bold">
                          {creator.display_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Link>

                    <div className="w-full min-h-[80px]">
                      <Link
                        href={`/profile/${creator.username}`}
                        className="font-semibold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1 block"
                      >
                        {creator.display_name}
                      </Link>
                      <p className="text-sm text-gray-500 mb-2">@{creator.username}</p>

                      {creator.bio ? (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {creator.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Adventure seeker
                        </p>
                      )}

                      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-600">
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
