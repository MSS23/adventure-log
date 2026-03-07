'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import { Heart, Camera, Trophy, Sparkles } from 'lucide-react'
import { log } from '@/lib/utils/logger'

interface FeaturedPhoto {
  id: string
  file_path: string
  caption?: string
  taken_at?: string
  album_id: string
  album: {
    id: string
    title: string
    location_name?: string
    user_id: string
  }
  user: {
    id: string
    username: string
    display_name: string | null
    avatar_url?: string | null
  }
  likes_count: number
}

export function PhotoOfTheWeek() {
  const [photo, setPhoto] = useState<FeaturedPhoto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPhotoOfTheWeek()
  }, [])

  async function fetchPhotoOfTheWeek() {
    const supabase = createClient()

    try {
      // Get photos from the last 7 days, ordered by likes
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('photos')
        .select(`
          id,
          file_path,
          caption,
          taken_at,
          album_id,
          created_at,
          albums!inner(
            id,
            title,
            location_name,
            user_id,
            users!albums_user_id_fkey(
              id,
              username,
              display_name,
              avatar_url
            )
          ),
          likes:likes(count)
        `)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      if (!data || data.length === 0) {
        setLoading(false)
        return
      }

      // Count likes per photo and find the one with most likes
      const photosWithLikes = data.map(photo => {
        const likesCount = (photo.likes as Array<{ count?: number }>)?.[0]?.count || 0
        const album = Array.isArray(photo.albums) ? photo.albums[0] : photo.albums
        // Handle users being either an object or array
        const usersData = album?.users
        const user = Array.isArray(usersData) ? usersData[0] : usersData

        return {
          id: photo.id,
          file_path: photo.file_path,
          caption: photo.caption,
          taken_at: photo.taken_at,
          album_id: photo.album_id,
          album: {
            id: album?.id || '',
            title: album?.title || 'Untitled',
            location_name: album?.location_name,
            user_id: album?.user_id || ''
          },
          user: {
            id: user?.id || '',
            username: user?.username || 'user',
            display_name: user?.display_name || null,
            avatar_url: user?.avatar_url || null
          },
          likes_count: likesCount
        }
      })

      // Sort by likes and get the top photo
      const topPhoto = photosWithLikes.sort((a, b) => b.likes_count - a.likes_count)[0]

      if (topPhoto) {
        setPhoto(topPhoto)
      }
    } catch (error) {
      log.error('Failed to fetch photo of the week', {
        component: 'PhotoOfTheWeek',
        action: 'fetch'
      }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="aspect-[4/5] bg-gray-200 rounded-lg" />
      </div>
    )
  }

  if (!photo) {
    return null
  }

  const photoUrl = getPhotoUrl(photo.file_path)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
            <Trophy className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              Photo of the Week
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Most loved photo this week
            </p>
          </div>
        </div>
      </div>

      {/* Photo */}
      <Link href={`/albums/${photo.album.id}`} className="block group">
        <div className="relative aspect-[4/5] bg-gray-100">
          {photoUrl && (
            <Image
              src={photoUrl}
              alt={photo.caption || photo.album.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>

      {/* Info */}
      <div className="p-4 space-y-3">
        {/* User Info */}
        <Link
          href={`/profile/${photo.user.username}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center overflow-hidden">
            {photo.user.avatar_url ? (
              <Image
                src={getPhotoUrl(photo.user.avatar_url, 'avatars') || ''}
                alt={photo.user.display_name || photo.user.username}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-teal-700">
                {(photo.user.display_name || photo.user.username)[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {photo.user.display_name || photo.user.username}
            </p>
            <p className="text-xs text-gray-500">@{photo.user.username}</p>
          </div>
        </Link>

        {/* Album & Location */}
        <Link
          href={`/albums/${photo.album.id}`}
          className="block hover:opacity-80 transition-opacity"
        >
          <p className="text-sm font-semibold text-gray-900">{photo.album.title}</p>
          {photo.album.location_name && (
            <p className="text-xs text-gray-600">{photo.album.location_name}</p>
          )}
        </Link>

        {/* Caption */}
        {photo.caption && (
          <p className="text-sm text-gray-700 line-clamp-2">{photo.caption}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-600">
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span className="text-sm font-medium">{photo.likes_count}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Camera className="h-4 w-4" />
            <span className="text-xs">Featured</span>
          </div>
        </div>
      </div>
    </div>
  )
}
