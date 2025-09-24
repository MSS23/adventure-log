'use client'

import React from 'react'
import { AdvancedSearch } from '@/components/search/AdvancedSearch'
import { motion } from 'framer-motion'

interface SearchResult {
  id: string
  type: 'album' | 'photo' | 'location'
  title: string
  description?: string
  imageUrl?: string
  location?: string
  date?: string
  matchReason: string[]
  relevanceScore: number
}

export default function SearchPage() {
  const handleResultSelect = (result: SearchResult) => {
    // Navigate to the selected result
    const url = result.type === 'album'
      ? `/albums/${result.id}`
      : result.type === 'photo'
      ? `/albums/${result.id}` // Assuming photos belong to albums
      : `/search?location=${encodeURIComponent(result.title)}`

    window.location.href = url
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Search Your Adventures
            </h1>
            <p className="text-gray-600 mt-2">
              Find albums, photos, and locations with powerful search and filtering
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <AdvancedSearch onResultSelect={handleResultSelect} />
      </motion.div>
    </div>
  )
}