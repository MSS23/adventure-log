'use client'

import { useState, useMemo } from 'react'
import { Album } from '@/types/database'
import { CountrySection } from '@/components/countries/CountrySection'
import { Button } from '@/components/ui/button'
import { getCountryName, extractCountryFromLocation } from '@/lib/utils/country'
import { Search, Globe, Plus } from 'lucide-react'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import Link from 'next/link'

interface CountriesContentProps {
  albums: Album[]
}

export default function CountriesContent({ albums }: CountriesContentProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Group albums by country
  const albumsByCountry = useMemo(() => {
    const grouped = albums.reduce((acc, album) => {
      let countryCode = album.country_code

      // If no country code, try to extract from location_name
      if (!countryCode && album.location_name) {
        const extractedCountry = extractCountryFromLocation(album.location_name)
        // Store the extracted country as a pseudo-code for grouping
        countryCode = extractedCountry || 'UNKNOWN'
      }

      if (!countryCode) {
        countryCode = 'UNKNOWN'
      }

      if (!acc[countryCode]) {
        acc[countryCode] = []
      }

      acc[countryCode].push(album)
      return acc
    }, {} as Record<string, Album[]>)

    // Sort countries by album count (descending)
    return Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length)
  }, [albums])

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) {
      return albumsByCountry
    }

    const query = searchQuery.toLowerCase()

    return albumsByCountry.filter(([countryCode]) => {
      const countryName = countryCode === 'UNKNOWN'
        ? 'Unknown'
        : getCountryName(countryCode)

      return countryName.toLowerCase().includes(query)
    })
  }, [albumsByCountry, searchQuery])

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="al-eyebrow mb-1">Atlas</p>
          <h1 className="al-display text-3xl md:text-4xl flex items-center gap-3">
            <Globe className="h-7 w-7" style={{ color: 'var(--color-coral)' }} />
            Countries
          </h1>
          <p className="text-sm text-[color:var(--color-muted-warm)] mt-2">
            {albums.length > 0
              ? `${albums.length} album${albums.length === 1 ? '' : 's'} across ${albumsByCountry.length} countries`
              : 'Start your journey, one country at a time.'}
          </p>
        </div>
        <Link href="/albums/new" className="shrink-0">
          <Button className="bg-olive-600 hover:bg-olive-700 text-white cursor-pointer active:scale-[0.97] transition-all duration-200 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Album
          </Button>
        </Link>
      </div>

      {/* Search Section */}
      {albums.length > 0 && (
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-stone-200/60 dark:border-white/[0.06] p-4 sm:p-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder={`Search ${albumsByCountry.length} countries...`}
              className="w-full pl-10 pr-24 py-2.5 bg-stone-50 dark:bg-[#1A1A1A] border border-stone-200 dark:border-white/[0.1] rounded-xl text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent transition-all duration-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-olive-600 dark:text-olive-400 hover:text-olive-700 dark:hover:text-olive-300 font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-olive-500 focus-visible:outline-none rounded px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Country Sections */}
      {filteredCountries.length > 0 ? (
        <div className="space-y-3">
          {filteredCountries.map(([countryCode, countryAlbums], index) => {
            const countryName = countryCode === 'UNKNOWN'
              ? 'Unknown'
              : getCountryName(countryCode)

            return (
              <CountrySection
                key={countryCode}
                countryCode={countryCode}
                countryName={countryName}
                albums={countryAlbums}
                defaultExpanded={index === 0}
              />
            )
          })}
        </div>
      ) : searchQuery.trim() ? (
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-stone-200/60 dark:border-white/[0.06] p-10 sm:p-12 text-center">
          <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-stone-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1.5">
            No matches found
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-5 max-w-md mx-auto">
            We couldn&apos;t find any countries matching &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="cursor-pointer active:scale-[0.97] transition-all duration-200"
          >
            Clear search
          </Button>
        </div>
      ) : albums.length === 0 ? (
        <EnhancedEmptyState
          icon={<Globe className="h-12 w-12" />}
          title="No Countries Yet"
          description="Create albums with locations to see your countries here."
          action={{ label: 'Create Album', onClick: () => window.location.href = '/albums/new' }}
        />
      ) : (
        <div className="bg-white dark:bg-[#111111] rounded-2xl border border-stone-200/60 dark:border-white/[0.06] p-10 sm:p-12 text-center">
          <div className="w-16 h-16 bg-olive-100 dark:bg-olive-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-olive-600 dark:text-olive-400" />
          </div>
          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1.5">
            Location Data Missing
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Your albums don&apos;t have country information yet. Add location details to see them organized here.
          </p>
        </div>
      )}
    </div>
  )
}
