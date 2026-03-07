'use client'

import { useState } from 'react'
import { Album } from '@/types/database'
import { AlbumGrid } from '@/components/albums/AlbumGrid'
import { getFlagEmoji } from '@/lib/utils/country'
import { ChevronDown, MapPin } from 'lucide-react'
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

  // Get unique locations within this country
  const uniqueLocations = Array.from(
    new Set(albums.map(a => a.location_name).filter(Boolean))
  ).length

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Enhanced Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-4 p-5 transition-all duration-200",
          "hover:bg-gradient-to-r hover:from-teal-50/50 hover:to-cyan-50/50",
          isExpanded && "bg-gradient-to-r from-gray-50/50 to-white"
        )}
        aria-expanded={isExpanded}
        aria-controls={`country-albums-${countryCode}`}
      >
        {/* Flag with enhanced container */}
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-2xl">
              {getFlagEmoji(countryCode)}
            </span>
          </div>
          {albums.length > 5 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">{albums.length}</span>
            </div>
          )}
        </div>

        {/* Country Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {countryName}
            </h3>
            {countryCode === 'UNKNOWN' && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                Location pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm text-gray-600">
              {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </p>
            {uniqueLocations > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{uniqueLocations} {uniqueLocations === 1 ? 'location' : 'locations'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Chevron */}
        <div className={cn(
          "p-2 rounded-lg transition-all duration-300",
          isExpanded ? "bg-teal-50" : "bg-gray-50"
        )}>
          <ChevronDown
            className={cn(
              "h-5 w-5 transition-all duration-300",
              isExpanded ? "rotate-180 text-teal-600" : "text-gray-400"
            )}
          />
        </div>
      </button>

      {/* Enhanced Albums Grid with smooth animation */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        {isExpanded && (
          <div
            id={`country-albums-${countryCode}`}
            className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gradient-to-b from-gray-50/30 to-white"
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
    </div>
  )
}
