'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Camera,
  Globe,
  Lock,
  UserPlus,
  UserMinus,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { User, Album } from '@/types/database'
import { useFollows } from '@/lib/hooks/useFollows'
import { PrivateAccountMessage } from '@/components/social/PrivateAccountMessage'
import Image from 'next/image'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const supabase = createClient()
  const { getFollowStatus, followUser, unfollowUser } = useFollows()
  const [followStatus, setFollowStatus] = useState<'not_following' | 'following' | 'pending' | 'blocked'>('not_following')
  const [followLoading, setFollowLoading] = useState(false)

  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (userError) {
          if (userError.code === 'PGRST116') {
            throw new Error('User not found')
          }
          throw userError
        }

        setProfile(userData)

        // Check if account is private and if current user follows them
        if (userData.is_private && currentUser?.id !== userId && userId) {
          const status = await getFollowStatus(userId)
          setFollowStatus(status)

          if (status !== 'following') {
            setIsPrivate(true)
            setLoading(false)
            return
          }
        }

        // Fetch user's public albums (exclude drafts)
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select(`
            *,
            cover_photo:photos!cover_photo_id(storage_path)
          `)
          .eq('user_id', userId)
          .eq('visibility', 'public')
          .neq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(12)

        if (albumsError) throw albumsError

        setAlbums(albumsData || [])
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    if (userId && currentUser) {
      fetchUserProfile()
    }
  }, [userId, currentUser, supabase, getFollowStatus])

  const handleFollowToggle = async () => {
    if (!profile) return

    try {
      setFollowLoading(true)

      if (followStatus === 'following') {
        await unfollowUser(profile.id)
        setFollowStatus('not_following')
      } else {
        await followUser(profile.id)
        setFollowStatus(profile.is_private ? 'pending' : 'following')
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <Button variant="outline" onClick={() => router.push('/feed')} className="mt-4">
              Go to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  // Redirect to own profile if viewing own page
  if (currentUser?.id === userId) {
    router.push('/profile')
    return null
  }

  // Show private account message
  if (isPrivate) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <PrivateAccountMessage profile={profile} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.name || 'User'} />
              <AvatarFallback className="text-2xl">
                {profile.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-2xl font-bold">{profile.name || 'Anonymous User'}</h1>
                {profile.email && (
                  <p className="text-gray-600 text-sm mt-1">{profile.email}</p>
                )}
              </div>

              {profile.bio && (
                <p className="text-gray-700">{profile.bio}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  variant={followStatus === 'following' ? 'outline' : 'default'}
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : followStatus === 'following' ? (
                    <UserMinus className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {followStatus === 'following' ? 'Unfollow' : followStatus === 'pending' ? 'Requested' : 'Follow'}
                </Button>

                {/* View Options */}
                <Link href={`/globe?user=${userId}`}>
                  <Button variant="outline">
                    <Globe className="h-4 w-4 mr-2" />
                    Globe View
                  </Button>
                </Link>
                <Link href={`/albums?user=${userId}`}>
                  <Button variant="outline">
                    <Camera className="h-4 w-4 mr-2" />
                    Albums
                  </Button>
                </Link>
              </div>

              {profile.is_private && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Private Account
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Albums Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Public Albums</h2>
        {albums.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Camera className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No public albums yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.map((album) => (
              <Link key={album.id} href={`/albums/${album.id}`}>
                <div className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all">
                  {album.cover_photo?.storage_path ? (
                    <Image
                      src={album.cover_photo.storage_path}
                      alt={album.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="font-medium text-sm truncate">{album.title}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
