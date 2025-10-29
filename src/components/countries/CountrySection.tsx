'use client'

import { useState } from 'react'
import { Album } from '@/types/database'
import { AlbumGrid } from '@/components/albums/AlbumGrid'
import { getFlagEmoji } from '@/lib/utils/country'
import { ChevronDown } from 'lucide-react'
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
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`country-albums-${countryCode}`}
      >
        {/* Flag */}
        <div className="w-10 h-10 rounded border border-gray-200 flex items-center justify-center text-2xl flex-shrink-0 bg-white">
          {getFlagEmoji(countryCode)}
        </div>

        {/* Country Name */}
        <span className="text-lg font-semibold text-gray-900 flex-1 text-left">
          {countryName}
        </span>

        {/* Album Count */}
        <span className="text-sm text-gray-600 flex-shrink-0">
          {albums.length} {albums.length === 1 ? 'album' : 'albums'}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "h-5 w-5 text-gray-400 transition-transform duration-200 flex-shrink-0",
            isExpanded ? '' : '-rotate-90'
          )}
        />
      </button>

      {/* Albums Grid */}
      {isExpanded && (
        <div
          id={`country-albums-${countryCode}`}
          className="p-4 bg-gray-50 border-t border-gray-200"
        >
          <AlbumGrid
            albums={albums}
            columns={4}
            emptyMessage={`No albums found in ${countryName}`}
          />
        </div>
      )}
    </div>
  )
}
