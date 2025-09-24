'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Calendar,
  Camera,
  Heart,
  Star,
  Navigation,
  Thermometer,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface LocationPreviewData {
  id: string
  name: string
  country: string
  latitude: number
  longitude: number
  visitDate: string
  albumCount: number
  photoCount: number
  favoritePhotoUrls: string[]
  coverPhotoUrl?: string
  description?: string
  tags: string[]
  weather?: {
    temperature: number
    condition: string
    icon: string
  }
  stats?: {
    likes: number
    views: number
    shares: number
    rating: number
  }
  isPublic: boolean
  isFavorite: boolean
}

interface LocationPreviewProps {
  location: LocationPreviewData
  position: { x: number; y: number }
  onClose: () => void
  onNavigate: (lat: number, lng: number) => void
  onFavorite: (locationId: string) => void
  className?: string
}

export function LocationPreview({
  location,
  position,
  onClose,
  onNavigate,
  onFavorite,
  className
}: LocationPreviewProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (location.favoritePhotoUrls.length > 1) {
            setCurrentPhotoIndex(prev =>
              prev === 0 ? location.favoritePhotoUrls.length - 1 : prev - 1
            )
          }
          break
        case 'ArrowRight':
          if (location.favoritePhotoUrls.length > 1) {
            setCurrentPhotoIndex(prev =>
              prev === location.favoritePhotoUrls.length - 1 ? 0 : prev + 1
            )
          }
          break
        case 'Enter':
          setIsExpanded(!isExpanded)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [location.favoritePhotoUrls.length, isExpanded, onClose])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCoordinates = (lat: number, lng: number) => {
    const latDir = lat >= 0 ? 'N' : 'S'
    const lngDir = lng >= 0 ? 'E' : 'W'
    return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lng).toFixed(2)}°${lngDir}`
  }

  const nextPhoto = () => {
    setCurrentPhotoIndex(prev =>
      prev === location.favoritePhotoUrls.length - 1 ? 0 : prev + 1
    )
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex(prev =>
      prev === 0 ? location.favoritePhotoUrls.length - 1 : prev - 1
    )
  }

  const currentPhoto = location.favoritePhotoUrls[currentPhotoIndex] || location.coverPhotoUrl

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200',
        'max-w-sm w-full',
        className
      )}
      style={{
        left: Math.min(position.x, window.innerWidth - 400),
        top: Math.min(position.y, window.innerHeight - (isExpanded ? 600 : 400))
      }}
    >
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-bold text-gray-900 truncate flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                {location.name}
              </CardTitle>
              <p className="text-sm text-gray-800 mt-1">
                {location.country}
              </p>
            </div>

            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFavorite(location.id)}
                className={cn(
                  'h-8 w-8 p-0',
                  location.isFavorite ? 'text-red-600' : 'text-gray-700'
                )}
              >
                <Heart className={cn('h-4 w-4', location.isFavorite && 'fill-current')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-gray-700 hover:text-gray-800"
              >
                ×
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-800">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(location.visitDate)}
            </div>
            <div className="flex items-center gap-1">
              <Camera className="h-4 w-4" />
              {location.photoCount}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Photo Carousel */}
          {currentPhoto && (
            <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-100">
              <div
                className="aspect-video bg-cover bg-center bg-gray-200"
                style={{ backgroundImage: `url(${currentPhoto})` }}
              >
                {location.favoritePhotoUrls.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={prevPhoto}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 h-8 w-8 p-0 rounded-full"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={nextPhoto}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 text-white hover:bg-black/40 h-8 w-8 p-0 rounded-full"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Photo indicator dots */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {location.favoritePhotoUrls.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            index === currentPhotoIndex
                              ? 'bg-white'
                              : 'bg-white/50 hover:bg-white/75'
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Location Details */}
          <div className="space-y-3">
            {/* Weather */}
            {location.weather && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <Thermometer className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  {location.weather.temperature}°C, {location.weather.condition}
                </span>
              </div>
            )}

            {/* Tags */}
            {location.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {location.tags.slice(0, isExpanded ? undefined : 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-sm">
                    {tag}
                  </Badge>
                ))}
                {!isExpanded && location.tags.length > 3 && (
                  <Badge variant="outline" className="text-sm">
                    +{location.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Description */}
            {isExpanded && location.description && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-sm text-gray-800 leading-relaxed"
              >
                {location.description}
              </motion.div>
            )}

            {/* Stats */}
            {location.stats && (
              <div className={cn(
                'grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg text-center',
                !isExpanded && 'hidden'
              )}>
                <div>
                  <div className="text-lg font-bold text-red-600">{location.stats.likes}</div>
                  <div className="text-sm text-gray-800">Likes</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{location.stats.views}</div>
                  <div className="text-sm text-gray-800">Views</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-1">
                    {location.stats.rating}
                    <Star className="h-3 w-3 fill-current" />
                  </div>
                  <div className="text-sm text-gray-800">Rating</div>
                </div>
              </div>
            )}

            {/* Coordinates */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 text-sm text-gray-800"
              >
                <Navigation className="h-4 w-4" />
                {formatCoordinates(location.latitude, location.longitude)}
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <Button
              size="sm"
              onClick={() => onNavigate(location.latitude, location.longitude)}
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Focus
            </Button>

            <Link href={`/albums/${location.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2"
            >
              {isExpanded ? 'Less' : 'More'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Overlay component for managing multiple previews
interface LocationPreviewOverlayProps {
  previews: Array<{
    location: LocationPreviewData
    position: { x: number; y: number }
  }>
  onClose: (locationId: string) => void
  onNavigate: (lat: number, lng: number) => void
  onFavorite: (locationId: string) => void
}

export function LocationPreviewOverlay({
  previews,
  onClose,
  onNavigate,
  onFavorite
}: LocationPreviewOverlayProps) {
  return (
    <AnimatePresence>
      {previews.map(({ location, position }) => (
        <LocationPreview
          key={location.id}
          location={location}
          position={position}
          onClose={() => onClose(location.id)}
          onNavigate={onNavigate}
          onFavorite={onFavorite}
        />
      ))}
    </AnimatePresence>
  )
}