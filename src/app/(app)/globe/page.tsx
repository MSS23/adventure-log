'use client'

import { EnhancedGlobe } from '@/components/globe/EnhancedGlobe'

export default function GlobePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-amber-50">
      <div className="container mx-auto px-4 py-6">
        <EnhancedGlobe />
      </div>
    </div>
  )
}