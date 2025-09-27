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
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Search Your Adventures
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Find albums, photos, and locations from your travel memories with our powerful search and filtering tools
            </p>
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
    </div>
  )
}