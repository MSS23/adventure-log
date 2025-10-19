'use client'

import React, { useState } from 'react'
import { AdvancedSearch } from '@/components/search/AdvancedSearch'
import { CurrentWeatherCard } from '@/components/weather/CurrentWeatherCard'
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

export default function SearchPage() {
  const [weatherLocation, setWeatherLocation] = useState<{ lat: number; lng: number; name: string } | null>(null)

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
    <div className="space-y-4">
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