'use client'

import { EnhancedGlobe } from '@/components/globe/EnhancedGlobe'

export default function GlobePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <EnhancedGlobe />
      </div>
    </div>
  )
}