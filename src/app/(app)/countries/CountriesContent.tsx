'use client'

import { useState, useMemo } from 'react'
import { Album } from '@/types/database'
import { CountrySection } from '@/components/countries/CountrySection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCountryName, extractCountryFromLocation } from '@/lib/utils/country'
import { Search, Globe, Plus } from 'lucide-react'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import { PageHeader } from '@/components/layout/PageHeader'
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
    <div className="space-y-8">
      {/* Page Header — shared Back + Home navigation */}
      <PageHeader
        eyebrow="Atlas"
        title="Countries"
        subtitle={
          albums.length > 0
            ? `${albums.length} album${albums.length === 1 ? '' : 's'} across ${albumsByCountry.length} countries`
            : 'Start your journey, one country at a time.'
        }
        actions={
          <Button asChild>
            <Link href="/albums/new">
              <Plus className="h-4 w-4 mr-2" />
              New Album
            </Link>
          </Button>
        }
      />

      {/* Search */}
      {albums.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`Search ${albumsByCountry.length} countries...`}
            className="h-10 rounded-full pl-10 pr-20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search countries"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear
            </button>
          )}
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
        <EnhancedEmptyState
          icon={<Search className="h-12 w-12" />}
          title="No matches found"
          description={`We couldn't find any countries matching "${searchQuery}"`}
          action={{ label: 'Clear search', onClick: () => setSearchQuery('') }}
        />
      ) : albums.length === 0 ? (
        <EnhancedEmptyState
          icon={<Globe className="h-12 w-12" />}
          title="No Countries Yet"
          description="Create albums with locations to see your countries here."
          action={{ label: 'Create Album', onClick: () => window.location.href = '/albums/new' }}
        />
      ) : (
        <EnhancedEmptyState
          icon={<Globe className="h-12 w-12" />}
          title="Location Data Missing"
          description="Your albums don't have country information yet. Add location details to see them organized here."
        />
      )}
    </div>
  )
}
