'use client'

import { useState, useEffect } from 'react'
import { useCountryShowcase, type CountryShowcase as CountryShowcaseType, type CountryAlbum } from '@/lib/hooks/useCountryShowcase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { MapPin, Camera, Loader2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function CountryShowcase() {
  const { countries, loading, error, refreshData } = useCountryShowcase()
  const [selectedCountry, setSelectedCountry] = useState<CountryShowcaseType | null>(null)

  // Refresh data when component becomes visible (e.g., switching tabs or navigating back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData()
      }
    }

    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Also refresh on window focus (when user comes back to the tab)
    window.addEventListener('focus', refreshData)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', refreshData)
    }
  }, [refreshData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={refreshData} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (countries.length === 0) {
    return (
      <div className="text-center py-16">
        <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Country Data Available
        </h3>
        <p className="text-gray-600">
          Albums with location data will appear here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Community Showcase
          </h2>
          <p className="text-gray-600">
            Explore the most popular albums by country from our travel community
          </p>
        </div>

        {/* Country Grid - Collages */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countries.map((country) => (
            <CountryCard
              key={country.country_code}
              country={country}
              onClick={() => setSelectedCountry(country)}
            />
          ))}
        </div>
      </div>

      {/* Country Detail Modal */}
      <CountryDetailDialog
        country={selectedCountry}
        onClose={() => setSelectedCountry(null)}
      />
    </>
  )
}

interface CountryCardProps {
  country: CountryShowcaseType
  onClick: () => void
}

function CountryCard({ country, onClick }: CountryCardProps) {
  const { country_name, album_count, albums } = country

  // Get flag emoji from country code
  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  // Get the most popular album (first one, already sorted by likes)
  const mostPopularAlbum = albums[0]

  return (
    <Card
      className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Country Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getFlagEmoji(country.country_code)}</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{country_name}</h3>
              <p className="text-xs text-gray-600">
                {album_count} {album_count === 1 ? 'album' : 'albums'}
              </p>
            </div>
          </div>
        </div>

        {/* Most Popular Album Preview */}
        <div className="relative bg-gray-100 aspect-[3/2]">
          {mostPopularAlbum?.cover_image_url ? (
            <Image
              src={mostPopularAlbum.cover_image_url}
              alt={mostPopularAlbum.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              style={{
                objectPosition: `${mostPopularAlbum.cover_photo_x_offset ?? 50}% ${mostPopularAlbum.cover_photo_y_offset ?? 50}%`
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <Camera className="h-12 w-12 text-gray-300" />
            </div>
          )}

          {/* Album title overlay */}
          {mostPopularAlbum && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
              <p className="text-white font-semibold text-sm truncate">{mostPopularAlbum.title}</p>
              <p className="text-white/80 text-xs truncate">by {mostPopularAlbum.user.display_name}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface CountryDetailDialogProps {
  country: CountryShowcaseType | null
  onClose: () => void
}

function CountryDetailDialog({ country, onClose }: CountryDetailDialogProps) {
  if (!country) return null

  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  return (
    <Dialog open={!!country} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="text-3xl">{getFlagEmoji(country.country_code)}</span>
            {country.country_name}
          </DialogTitle>
          <DialogDescription>
            Top {Math.min(5, country.album_count)} most popular {country.album_count === 1 ? 'album' : 'albums'} this month
          </DialogDescription>
        </DialogHeader>

        {/* Album Grid - Show top 5 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {country.albums.slice(0, 5).map((album) => (
            <AlbumThumbnail key={album.id} album={album} />
          ))}
        </div>

        {/* View All Link */}
        <div className="mt-6 text-center">
          <Link
            href={`/search?country=${country.country_code}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            onClick={onClose}
          >
            <MapPin className="h-5 w-5" />
            Explore All Albums in {country.country_name}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AlbumThumbnailProps {
  album: CountryAlbum
}

function AlbumThumbnail({ album }: AlbumThumbnailProps) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      {album.cover_image_url ? (
        <Image
          src={album.cover_image_url}
          alt={album.title}
          fill
          className="object-cover"
          style={{
            objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%`
          }}
          sizes="(max-width: 768px) 50vw, 33vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <Camera className="h-12 w-12 text-gray-400" />
        </div>
      )}

      {/* Overlay with album info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <p className="font-semibold text-sm truncate">{album.title}</p>
          <p className="text-white/80 text-xs truncate mt-1">by {album.user.display_name}</p>
        </div>
      </div>
    </Link>
  )
}
