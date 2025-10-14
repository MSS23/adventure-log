'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Calendar,
  Camera,
  Plane,
  Plus,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { Album } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { log } from '@/lib/utils/logger'
import Link from 'next/link'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'

interface Trip {
  id: string
  name: string
  startDate: Date
  endDate: Date
  albums: Album[]
  locations: Set<string>
  photoCount: number
  coverImageUrl?: string
}

interface TripCollectionsProps {
  userId: string
  className?: string
}

export function TripCollections({ userId, className }: TripCollectionsProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAndOrganizeTrips()
  }, [userId])

  const fetchAndOrganizeTrips = async () => {
    try {
      setLoading(true)

      // Fetch user's albums with photos
      const { data: albums, error } = await supabase
        .from('albums')
        .select(`
          *,
          photos(id, file_path)
        `)
        .eq('user_id', userId)
        .order('start_date', { ascending: false })

      if (error) throw error

      // Smart trip grouping algorithm
      const organizedTrips = groupAlbumsIntoTrips(albums || [])
      setTrips(organizedTrips)

      log.info('Trips organized', {
        component: 'TripCollections',
        tripCount: organizedTrips.length
      })
    } catch (error) {
      log.error('Failed to fetch trips', {
        component: 'TripCollections'
      }, error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }

  const groupAlbumsIntoTrips = (albums: any[]): Trip[] => {
    if (!albums.length) return []

    // Sort albums by date
    const sortedAlbums = albums
      .filter(a => a.start_date)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    const trips: Trip[] = []
    let currentTrip: Album[] = []
    let lastDate: Date | null = null

    sortedAlbums.forEach((album) => {
      const albumDate = new Date(album.start_date)

      // If more than 7 days apart, consider it a new trip
      if (lastDate && albumDate.getTime() - lastDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
        if (currentTrip.length > 0) {
          trips.push(createTripFromAlbums(currentTrip))
        }
        currentTrip = [album]
      } else {
        currentTrip.push(album)
      }

      lastDate = album.end_date ? new Date(album.end_date) : albumDate
    })

    // Add final trip
    if (currentTrip.length > 0) {
      trips.push(createTripFromAlbums(currentTrip))
    }

    return trips
  }

  const createTripFromAlbums = (albums: any[]): Trip => {
    const locations = new Set<string>()
    let photoCount = 0
    let coverImageUrl: string | undefined

    albums.forEach((album) => {
      if (album.location_name) locations.add(album.location_name)
      photoCount += album.photos?.length || 0

      if (!coverImageUrl && album.cover_photo_url) {
        coverImageUrl = getPhotoUrl(album.cover_photo_url) || undefined
      }
    })

    const startDate = new Date(albums[0].start_date)
    const endDate = new Date(albums[albums.length - 1].end_date || albums[albums.length - 1].start_date)

    // Generate trip name from locations or date
    const locationList = Array.from(locations)
    let name = ''

    if (locationList.length === 1) {
      name = locationList[0]
    } else if (locationList.length === 2) {
      name = `${locationList[0]} & ${locationList[1]}`
    } else if (locationList.length > 2) {
      name = `${locationList[0]} + ${locationList.length - 1} more`
    } else {
      name = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }

    return {
      id: `trip-${albums[0].id}`,
      name,
      startDate,
      endDate,
      albums,
      locations,
      photoCount,
      coverImageUrl
    }
  }

  const formatDateRange = (start: Date, end: Date) => {
    const sameMonth = start.getMonth() === end.getMonth()
    const sameYear = start.getFullYear() === end.getFullYear()

    if (sameMonth && sameYear) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`
    } else if (sameYear) {
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <Plane className="h-12 w-12 mx-auto mb-3 text-gray-400 animate-pulse" />
            <p>Organizing your trips...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (trips.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <Plane className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium mb-1">No trips yet</p>
            <p className="text-sm">Start creating albums to see your trips organized here</p>
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
            <Sparkles className="h-5 w-5 text-blue-600" />
            Your Trips
            <Badge variant="secondary" className="ml-2">
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
            </Badge>
          </CardTitle>
          <Link href="/albums/new">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Album
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trips.map((trip, index) => (
            <div
              key={trip.id}
              className="group relative bg-gradient-to-br from-white to-gray-50 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="flex gap-4">
                {/* Trip Cover Image */}
                {trip.coverImageUrl && (
                  <div className="relative w-32 h-32 flex-shrink-0 bg-gray-100 rounded-l-xl overflow-hidden">
                    <Image
                      src={trip.coverImageUrl}
                      alt={trip.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="128px"
                    />
                  </div>
                )}

                {/* Trip Details */}
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg truncate group-hover:text-blue-600 transition-colors">
                        {trip.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      Trip #{trips.length - index}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Camera className="h-4 w-4" />
                      <span className="font-medium">{trip.albums.length}</span>
                      <span className="hidden sm:inline">
                        {trip.albums.length === 1 ? 'album' : 'albums'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">{trip.locations.size}</span>
                      <span className="hidden sm:inline">
                        {trip.locations.size === 1 ? 'location' : 'locations'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Camera className="h-4 w-4" />
                      <span className="font-medium">{trip.photoCount}</span>
                      <span className="hidden sm:inline">photos</span>
                    </div>
                  </div>

                  {/* Albums Preview */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {trip.albums.slice(0, 3).map((album) => (
                      <Link
                        key={album.id}
                        href={`/albums/${album.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-md text-xs font-medium text-blue-700 transition-colors"
                      >
                        {album.title}
                      </Link>
                    ))}
                    {trip.albums.length > 3 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600">
                        +{trip.albums.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* View Arrow */}
                <div className="flex items-center pr-4">
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
