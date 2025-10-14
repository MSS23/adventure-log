'use client'

import React from 'react'
import { AdvancedSearch } from '@/components/search/AdvancedSearch'
import { motion } from 'framer-motion'

interface SearchResult {
  id: string
  type: 'album' | 'photo' | 'user'
  title: string
  description?: string
  imageUrl?: string
  location?: string
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