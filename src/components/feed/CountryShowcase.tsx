'use client'

import { useState } from 'react'
import { useCountryShowcase, type CountryShowcase as CountryShowcaseType, type CountryAlbum } from '@/lib/hooks/useCountryShowcase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Heart, Camera, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function CountryShowcase() {
  const { countries, loading, error, refreshData } = useCountryShowcase()
  const [selectedCountry, setSelectedCountry] = useState<CountryShowcaseType | null>(null)

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
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Explore by Country
          </h2>
          <p className="text-gray-600">
            Discover popular destinations from our community
          </p>
        </div>

        {/* Country Grid */}
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
  const { country_name, album_count, total_likes, albums } = country

  // Get flag emoji from country code
  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  return (
    <Card
      className="group overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-gray-200 hover:border-blue-300"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Collage Grid - 2x3 layout */}
        <div className="relative">
          <div className="grid grid-cols-3 grid-rows-2 gap-1 aspect-[3/2] bg-gray-100">
            {albums.slice(0, 6).map((album, index) => (
              <div
                key={album.id}
                className={cn(
                  "relative overflow-hidden",
                  index === 0 && "col-span-2 row-span-2" // First image takes 2x2 space
                )}
              >
                {album.cover_image_url ? (
                  <Image
                    src={album.cover_image_url}
                    alt={album.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    style={{
                      objectPosition: `${album.cover_photo_x_offset ?? 50}% ${album.cover_photo_y_offset ?? 50}%`
                    }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-300" />

          {/* Country Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{getFlagEmoji(country.country_code)}</span>
              <h3 className="text-xl font-bold">{country_name}</h3>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Camera className="h-4 w-4" />
                <span>{album_count} {album_count === 1 ? 'album' : 'albums'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                <span>{total_likes} {total_likes === 1 ? 'like' : 'likes'}</span>
              </div>
            </div>
          </div>
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
          <p className="text-gray-600">
            {country.album_count} {country.album_count === 1 ? 'album' : 'albums'} • {country.total_likes} {country.total_likes === 1 ? 'like' : 'likes'}
          </p>
        </DialogHeader>

        {/* Album Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {country.albums.map((album) => (
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
          <div className="flex items-center gap-3 text-xs mt-1">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{album.likes_count}</span>
            </div>
            <p className="truncate">by {album.user.display_name}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
