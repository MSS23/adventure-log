'use client'

import { useState } from 'react'
import { Album } from '@/types/database'
import { AlbumGrid } from '@/components/albums/AlbumGrid'
import { getFlagEmoji } from '@/lib/utils/country'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CountrySectionProps {
  countryCode: string
  countryName: string
  albums: Album[]
  defaultExpanded?: boolean
}

export function CountrySection({
  countryCode,
  countryName,
  albums,
  defaultExpanded = false
}: CountrySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-white">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 py-4 px-2 hover:bg-gray-50 transition-colors border-b border-gray-200"
        aria-expanded={isExpanded}
        aria-controls={`country-albums-${countryCode}`}
      >
        {/* Flag Emoji */}
        <span className="text-2xl flex-shrink-0">
          {getFlagEmoji(countryCode)}
        </span>

        {/* Country Name */}
        <span className="text-xl font-semibold text-gray-900 flex-1 text-left">
          {countryName}
        </span>

        {/* Chevron */}
        <ChevronUp
          className={cn(
            "h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0",
            isExpanded ? '' : 'rotate-180'
          )}
        />
      </button>

      {/* Albums Grid */}
      {isExpanded && (
        <div
          id={`country-albums-${countryCode}`}
          className="px-2 py-6"
        >
          <AlbumGrid
            albums={albums}
            columns={4}
            emptyMessage={`No albums found in ${countryName}`}
            useSimpleCard={true}
          />
        </div>
      )}
    </div>
  )
}
