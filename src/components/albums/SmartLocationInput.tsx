'use client'

import { useState, useEffect } from 'react'
import { MapPin, Sparkles, Loader2, Navigation } from 'lucide-react'
import { LocationSuggestions } from './LocationSuggestions'
import { Button } from '@/components/ui/button'
import { useSmartLocation } from '@/lib/hooks/useSmartLocation'
import { cn } from '@/lib/utils'

interface SmartLocationInputProps {
  value: string
  onChange: (value: string) => void
  onLocationDataChange?: (data: { latitude: number; longitude: number; countryCode: string }) => void
  photos?: File[]
  className?: string
}

export function SmartLocationInput({
  value,
  onChange,
  onLocationDataChange,
  photos = [],
  className
}: SmartLocationInputProps) {
  const { locationData, isDetecting, detectLocationFromPhotos, clearLocation } = useSmartLocation()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false)

  // Auto-detect location when photos are uploaded
  useEffect(() => {
    if (photos.length > 0 && !locationData) {
      detectLocationFromPhotos(photos)
    }
  }, [photos, locationData, detectLocationFromPhotos])

  // Update parent component when location is detected
  useEffect(() => {
    if (locationData) {
      onChange(locationData.locationName)
      onLocationDataChange?.({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        countryCode: locationData.countryCode
      })
    }
  }, [locationData, onChange, onLocationDataChange])

  const handleGetCurrentLocation = async () => {
    setIsGettingCurrentLocation(true)
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported')
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          // Reverse geocode
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              {
                headers: { 'User-Agent': 'AdventureLog/1.0' }
              }
            )
            const data = await response.json()
            const address = data.address || {}
            const city = address.city || address.town || address.village
            const country = address.country
            const countryCode = address.country_code?.toUpperCase() || 'XX'
            const locationName = city && country ? `${city}, ${country}` : country || 'Current Location'

            onChange(locationName)
            onLocationDataChange?.({ latitude, longitude, countryCode })
          } catch (error) {
            onChange(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
            onLocationDataChange?.({ latitude, longitude, countryCode: 'XX' })
          } finally {
            setIsGettingCurrentLocation(false)
          }
        },
        (error) => {
          console.error('Geolocation error:', error)
          setIsGettingCurrentLocation(false)
        }
      )
    } catch (error) {
      setIsGettingCurrentLocation(false)
    }
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Main Location Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Location
          </label>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Enter location or use suggestions below"
              className={cn(
                "w-full pl-10 pr-12 py-2.5 border rounded-lg text-sm",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all",
                locationData?.confidence ? "border-teal-300 bg-teal-50/50" : "border-gray-300"
              )}
            />

            {/* Auto-detected badge */}
            {locationData?.confidence && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Sparkles className="h-4 w-4 text-teal-600" />
              </div>
            )}

            {/* Current Location Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGetCurrentLocation}
              disabled={isGettingCurrentLocation}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-full px-3"
              title="Use current location"
            >
              {isGettingCurrentLocation ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              ) : (
                <Navigation className="h-4 w-4 text-gray-400 hover:text-teal-600" />
              )}
            </Button>
          </div>

          {/* Auto-detection info */}
          {isDetecting && (
            <div className="flex items-center gap-2 mt-2 text-sm text-teal-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Detecting location from photos...</span>
            </div>
          )}

          {locationData && !isDetecting && (
            <div className="flex items-center gap-2 mt-2 text-sm text-teal-700">
              <Sparkles className="h-3 w-3" />
              <span>
                Auto-detected from photo GPS data
                {locationData.confidence < 1 && ` (${Math.round(locationData.confidence * 100)}% confidence)`}
              </span>
            </div>
          )}
        </div>

        {/* Location Suggestions */}
        {showSuggestions && (
          <LocationSuggestions
            onSelectLocation={(location) => {
              onChange(location.name)
              onLocationDataChange?.({
                latitude: location.latitude,
                longitude: location.longitude,
                countryCode: location.countryCode
              })
              setShowSuggestions(false)
            }}
          />
        )}
      </div>
    </div>
  )
}
