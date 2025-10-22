'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdvancedSearch } from '@/components/search/AdvancedSearch'
import { CurrentWeatherCard } from '@/components/weather/CurrentWeatherCard'
import { BackButton } from '@/components/common/BackButton'
import { motion } from 'framer-motion'

interface SearchResult {
  id: string
  type: 'album' | 'photo' | 'user'
  title: string
  description?: string
  imageUrl?: string
  location?: string
  latitude?: number
  longitude?: number
  date?: string
  visibility?: 'public' | 'private' | 'friends'
  privacyLevel?: 'public' | 'private' | 'friends'
  userId?: string
  username?: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  relevanceScore?: number
}

// Map country codes to their names
const COUNTRY_NAMES: Record<string, string> = {
  'ES': 'Spain',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'PT': 'Portugal',
  'GB': 'United Kingdom',
  'US': 'United States',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'GR': 'Greece',
  'TR': 'Turkey',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'HR': 'Croatia',
  'SI': 'Slovenia',
  'RS': 'Serbia',
  'ME': 'Montenegro',
  'BA': 'Bosnia and Herzegovina',
  'DK': 'Denmark',
  'SE': 'Sweden',
  'NO': 'Norway',
  'FI': 'Finland',
  'IS': 'Iceland',
  'IE': 'Ireland',
  'AU': 'Australia',
  'CA': 'Canada',
  'JP': 'Japan',
  'CN': 'China',
  'IN': 'India',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'PE': 'Peru',
  'CO': 'Colombia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'ID': 'Indonesia',
  'PH': 'Philippines',
  'KR': 'South Korea',
  'NZ': 'New Zealand',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'MA': 'Morocco',
  'KE': 'Kenya',
  'AE': 'United Arab Emirates',
  'IL': 'Israel',
  'JO': 'Jordan',
  'LB': 'Lebanon',
  'SA': 'Saudi Arabia'
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [weatherLocation, setWeatherLocation] = useState<{ lat: number; lng: number; name: string } | null>(null)
  const [pageTitle, setPageTitle] = useState<string>('Search')

  // Check if we're searching by country
  useEffect(() => {
    const countryCode = searchParams.get('country')
    if (countryCode) {
      const countryName = COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode
      setPageTitle(`Top Albums in ${countryName}`)
    }
  }, [searchParams])

  const handleResultSelect = (result: SearchResult) => {
    // Navigate to the selected result
    let url: string

    if (result.type === 'user') {
      url = `/profile/${result.id}`
    } else if (result.type === 'album') {
      url = `/albums/${result.id}`
    } else {
      url = `/albums/${result.id}` // Photos belong to albums
    }

    window.location.href = url
  }

  // Show weather if we detected a location
  const showWeather = weatherLocation !== null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back Button */}
      <div className="px-2 sm:px-4">
        <BackButton fallbackRoute="/feed" />
      </div>

      {/* Page Title for country searches */}
      {searchParams.get('country') && (
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Explore the most popular albums from the community
          </p>
        </div>
      )}

      {/* Weather Card */}
      {showWeather && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CurrentWeatherCard
            latitude={weatherLocation.lat}
            longitude={weatherLocation.lng}
            locationName={weatherLocation.name}
            className="max-w-2xl mx-auto"
          />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: showWeather ? 0.1 : 0 }}
      >
        <AdvancedSearch
          onResultSelect={handleResultSelect}
          onWeatherLocationDetected={(lat, lng, name) => setWeatherLocation({ lat, lng, name })}
        />
      </motion.div>
    </div>
  )
}
