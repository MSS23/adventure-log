'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, User, Camera, Globe, Users, UserCheck, TrendingUp } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import Link from 'next/link'

interface MonthlyHighlight {
  trendingDestination: {
    location: string
    count: number
  } | null
  topExplorer: {
    userId: string
    username: string
    displayName: string | null
    count: number
  } | null
  newAdventures: number
  countriesExplored: number
}

interface MonthlyHighlightsProps {
  className?: string
}

export function MonthlyHighlights({ className }: MonthlyHighlightsProps) {
  const { user } = useAuth()
  const [viewMode, setViewMode] = useState<'community' | 'friends'>('community')
  const [communityHighlights, setCommunityHighlights] = useState<MonthlyHighlight>({
    trendingDestination: null,
    topExplorer: null,
    newAdventures: 0,
    countriesExplored: 0
  })
  const [friendsHighlights, setFriendsHighlights] = useState<MonthlyHighlight>({
    trendingDestination: null,
    topExplorer: null,
    newAdventures: 0,
    countriesExplored: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Get start of current month
  const getMonthStart = () => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }

  // Fetch community highlights (all users)
  const fetchCommunityHighlights = async () => {
    try {
      const monthStart = getMonthStart()

      // Get all albums from this month
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select('id, location_name, country_code, user_id, users!albums_user_id_fkey(id, username, display_name)')
        .gte('created_at', monthStart)
        .neq('status', 'draft')

      if (albumsError) {
        log.error('Failed to fetch community albums', { error: albumsError })
        return
      }

      if (!albums || albums.length === 0) {
        setCommunityHighlights({
          trendingDestination: null,
          topExplorer: null,
          newAdventures: 0,
          countriesExplored: 0
        })
        return
      }

      // Trending Destination: location with most albums
      const locationCounts: Record<string, number> = {}
      albums.forEach(album => {
        if (album.location_name) {
          locationCounts[album.location_name] = (locationCounts[album.location_name] || 0) + 1
        }
      })
      const trendingLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]

      // Top Explorer: user with most albums
      const userCounts: Record<string, { count: number; user: { username: string; display_name: string | null } }> = {}
      albums.forEach(album => {
        if (album.user_id && album.users && Array.isArray(album.users) && album.users[0]) {
          if (!userCounts[album.user_id]) {
            userCounts[album.user_id] = { count: 0, user: album.users[0] }
          }
          userCounts[album.user_id].count++
        }
      })
      const topUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0]

      // Countries Explored: unique countries
      // Try country_code first, fallback to extracting from location_name
      const uniqueCountries = new Set(
        albums
          .map(a => {
            if (a.country_code) return a.country_code
            // Fallback: extract country from location_name (last part after last comma)
            if (a.location_name) {
              const parts = a.location_name.split(',').map((p: string) => p.trim())
              return parts[parts.length - 1] // Last part is usually the country
            }
            return null
          })
          .filter((c): c is string => c !== null)
      )

      setCommunityHighlights({
        trendingDestination: trendingLocation ? {
          location: trendingLocation[0],
          count: trendingLocation[1]
        } : null,
        topExplorer: topUser ? {
          userId: Object.keys(userCounts).find(id => userCounts[id].count === topUser.count)!,
          username: topUser.user.username,
          displayName: topUser.user.display_name,
          count: topUser.count
        } : null,
        newAdventures: albums.length,
        countriesExplored: uniqueCountries.size
      })
    } catch (err) {
      log.error('Failed to fetch community highlights', {}, err)
    }
  }

  // Fetch friends highlights
  const fetchFriendsHighlights = async () => {
    try {
      if (!user) return

      const monthStart = getMonthStart()

      // Get user's friends (accepted followers)
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')

      if (followError) {
        log.error('Failed to fetch friends', { error: followError })
        return
      }

      const friendIds = followData?.map(f => f.following_id) || []

      if (friendIds.length === 0) {
        setFriendsHighlights({
          trendingDestination: null,
          topExplorer: null,
          newAdventures: 0,
          countriesExplored: 0
        })
        return
      }

      // Get albums from friends this month
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select('id, location_name, country_code, user_id, users!albums_user_id_fkey(id, username, display_name)')
        .in('user_id', friendIds)
        .gte('created_at', monthStart)
        .neq('status', 'draft')

      if (albumsError) {
        log.error('Failed to fetch friends albums', { error: albumsError })
        return
      }

      if (!albums || albums.length === 0) {
        setFriendsHighlights({
          trendingDestination: null,
          topExplorer: null,
          newAdventures: 0,
          countriesExplored: 0
        })
        return
      }

      // Calculate same stats as community
      const locationCounts: Record<string, number> = {}
      albums.forEach(album => {
        if (album.location_name) {
          locationCounts[album.location_name] = (locationCounts[album.location_name] || 0) + 1
        }
      })
      const trendingLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]

      const userCounts: Record<string, { count: number; user: { username: string; display_name: string | null } }> = {}
      albums.forEach(album => {
        if (album.user_id && album.users && Array.isArray(album.users) && album.users[0]) {
          if (!userCounts[album.user_id]) {
            userCounts[album.user_id] = { count: 0, user: album.users[0] }
          }
          userCounts[album.user_id].count++
        }
      })
      const topUser = Object.values(userCounts).sort((a, b) => b.count - a.count)[0]

      // Countries Explored: unique countries
      // Try country_code first, fallback to extracting from location_name
      const uniqueCountries = new Set(
        albums
          .map(a => {
            if (a.country_code) return a.country_code
            // Fallback: extract country from location_name (last part after last comma)
            if (a.location_name) {
              const parts = a.location_name.split(',').map((p: string) => p.trim())
              return parts[parts.length - 1] // Last part is usually the country
            }
            return null
          })
          .filter((c): c is string => c !== null)
      )

      setFriendsHighlights({
        trendingDestination: trendingLocation ? {
          location: trendingLocation[0],
          count: trendingLocation[1]
        } : null,
        topExplorer: topUser ? {
          userId: Object.keys(userCounts).find(id => userCounts[id].count === topUser.count)!,
          username: topUser.user.username,
          displayName: topUser.user.display_name,
          count: topUser.count
        } : null,
        newAdventures: albums.length,
        countriesExplored: uniqueCountries.size
      })
    } catch (err) {
      log.error('Failed to fetch friends highlights', {}, err)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([
        fetchCommunityHighlights(),
        fetchFriendsHighlights()
      ])
      setLoading(false)
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const currentHighlights = viewMode === 'community' ? communityHighlights : friendsHighlights

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Highlights
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'community' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('community')}
              className="text-xs"
            >
              <Users className="h-3 w-3 mr-1" />
              Community
            </Button>
            <Button
              variant={viewMode === 'friends' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('friends')}
              className="text-xs"
            >
              <UserCheck className="h-3 w-3 mr-1" />
              Friends
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {viewMode === 'community' ? 'Community' : 'Your friends'} activity this month
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trending Destination */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Trending Destination</h4>
              {currentHighlights.trendingDestination ? (
                <>
                  <p className="text-lg font-bold text-gray-900">
                    {currentHighlights.trendingDestination.location}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentHighlights.trendingDestination.count} {currentHighlights.trendingDestination.count === 1 ? 'album' : 'albums'} created
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">No destinations this month</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Explorer */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">Top Explorer</h4>
              {currentHighlights.topExplorer ? (
                <>
                  <Link
                    href={`/profile/${currentHighlights.topExplorer.username && currentHighlights.topExplorer.username !== 'user' ? currentHighlights.topExplorer.username : currentHighlights.topExplorer.userId}`}
                    className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {currentHighlights.topExplorer.displayName || `@${currentHighlights.topExplorer.username}`}
                  </Link>
                  <p className="text-sm text-gray-600">
                    {currentHighlights.topExplorer.count} {currentHighlights.topExplorer.count === 1 ? 'album' : 'albums'} this month
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">No explorers this month</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* New Adventures */}
          <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4 text-orange-600" />
              <h4 className="font-semibold text-gray-900 text-sm">New Adventures</h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {currentHighlights.newAdventures}
            </p>
            <p className="text-xs text-gray-600 mt-1">Albums created</p>
          </div>

          {/* Countries Explored */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <h4 className="font-semibold text-gray-900 text-sm">Countries</h4>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {currentHighlights.countriesExplored}
            </p>
            <p className="text-xs text-gray-600 mt-1">Unique countries</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
