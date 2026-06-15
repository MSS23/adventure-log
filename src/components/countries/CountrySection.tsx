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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-resting)] transition-[box-shadow,border-color] duration-200 hover:border-primary/30 hover:shadow-[var(--shadow-hover)]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-4 p-5 cursor-pointer transition-colors duration-200",
          "hover:bg-muted/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          isExpanded && "bg-muted/40"
        )}
        aria-expanded={isExpanded}
        aria-controls={`country-albums-${countryCode}`}
      >
        {/* Flag */}
        <div className="relative">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60">
            <span className="text-2xl">
              {getFlagEmoji(countryCode)}
            </span>
          </div>
          {albums.length > 5 && (
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">{albums.length}</span>
            </div>
          )}
        </div>

        {/* Country Info */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-base md:text-lg font-semibold text-foreground">
              {countryName}
            </h3>
            {countryCode === 'UNKNOWN' && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Location pending
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {albums.length} {albums.length === 1 ? 'album' : 'albums'}
            </p>
            {uniqueLocations > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{uniqueLocations} {uniqueLocations === 1 ? 'location' : 'locations'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isExpanded ? "rotate-180 text-primary" : "text-muted-foreground"
          )}
        />
      </button>

      {/* Albums Grid with smooth animation */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        {isExpanded && (
          <div
            id={`country-albums-${countryCode}`}
            className="border-t border-border px-5 pb-5 pt-4"
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
