'use client'

import React from 'react'
import { AdvancedSearch } from '@/components/search/AdvancedSearch'
import { motion } from 'framer-motion'

interface SearchResult {
  id: string
  type: 'album' | 'photo'
  title: string
  description?: string
  imageUrl?: string
  location?: string
  date?: string
  visibility: 'public' | 'private' | 'friends'
  userId: string
  username?: string
  relevanceScore: number
}

export default function SearchPage() {
  const handleResultSelect = (result: SearchResult) => {
    // Navigate to the selected result
    const url = result.type === 'album'
      ? `/albums/${result.id}`
      : `/albums/${result.id}` // Photos belong to albums

    window.location.href = url
  }

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <AdvancedSearch onResultSelect={handleResultSelect} />
      </motion.div>
    </div>
  )
}