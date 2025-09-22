'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  MapPin,
  Globe,
  Calendar,
  Camera,
  Edit,
  Settings,
  Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import { Profile } from '@/types/database'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    albums: 0,
    photos: 0,
    countries: 0,
    cities: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      const [albumsResult, photosResult] = await Promise.all([
        supabase
          .from('albums')
          .select('id, country_id, city_id')
          .eq('user_id', user?.id),
        supabase
          .from('photos')
          .select('id')
          .eq('user_id', user?.id)
      ])

      const albums = albumsResult.data || []
      const uniqueCountries = new Set(albums.filter(a => a.country_id).map(a => a.country_id))
      const uniqueCities = new Set(albums.filter(a => a.city_id).map(a => a.city_id))

      setStats({
        albums: albums.length,
        photos: photosResult.data?.length || 0,
        countries: uniqueCountries.size,
        cities: uniqueCities.size
      })
    } catch (err) {
      console.error('Error fetching profile stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

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
      <div className="space-y-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-yellow-600 font-medium">Profile not found</p>
              <p className="text-yellow-500 text-sm mt-1">Please complete your profile setup</p>
              <Link href="/setup" className="mt-4 inline-block">
                <Button>Complete Profile Setup</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || ''} alt={profile.display_name || profile.username} />
            <AvatarFallback className="text-xl">
              {getInitials(profile.display_name || profile.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.display_name || profile.username}
            </h1>
            {profile.display_name && (
              <p className="text-gray-600 text-lg">@{profile.username}</p>
            )}

            {profile.bio && (
              <p className="text-gray-700 mt-3 max-w-2xl">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.location}</span>
                </div>
              )}

              {profile.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDate(profile.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/profile/edit">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {loading ? '...' : stats.albums}
              </div>
              <div className="text-sm text-gray-600 mt-1">Albums</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {loading ? '...' : stats.photos}
              </div>
              <div className="text-sm text-gray-600 mt-1">Photos</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {loading ? '...' : stats.countries}
              </div>
              <div className="text-sm text-gray-600 mt-1">Countries</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {loading ? '...' : stats.cities}
              </div>
              <div className="text-sm text-gray-600 mt-1">Cities</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Privacy & Visibility
          </CardTitle>
          <CardDescription>
            How others can see and interact with your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Profile Visibility</p>
                <p className="text-sm text-gray-600">Who can see your profile and adventures</p>
              </div>
              <Badge variant={profile.privacy_level === 'public' ? 'default' : 'secondary'}>
                {profile.privacy_level === 'public' ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </>
                ) : profile.privacy_level === 'friends' ? (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Friends Only
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    Private
                  </>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get started with your adventure logging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/albums/new">
              <Button className="w-full h-16 text-left justify-start">
                <Camera className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Create New Album</div>
                  <div className="text-sm opacity-90">Start documenting your next adventure</div>
                </div>
              </Button>
            </Link>

            <Link href="/globe">
              <Button variant="outline" className="w-full h-16 text-left justify-start">
                <Globe className="h-6 w-6 mr-3" />
                <div>
                  <div className="font-medium">Explore Your Globe</div>
                  <div className="text-sm opacity-70">See your travels on an interactive 3D globe</div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}