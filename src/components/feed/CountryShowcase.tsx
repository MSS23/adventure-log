'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/types/database'
import { CountrySection } from '@/components/countries/CountrySection'
import { Input } from '@/components/ui/input'
import { Search, Loader2, MapPin } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import { getCountryName, extractCountryFromLocation } from '@/lib/utils/country'

export function CountryShowcase() {
  const { user } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const fetchAlbums = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('albums')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) {
          log.error('Error fetching albums for countries view', {
            component: 'CountryShowcase',
            action: 'fetchAlbums'
          }, fetchError)
          setError('Failed to load albums')
          return
        }

        setAlbums(data || [])
      } catch (err) {
        log.error('Error in fetchAlbums', {
          component: 'CountryShowcase',
          action: 'fetchAlbums'
        }, err as Error)
        setError('Failed to load albums')
      } finally {
        setLoading(false)
      }
    }

    fetchAlbums()
  }, [user, supabase])

  // Group albums by country
  const albumsByCountry = useMemo(() => {
    const grouped: Record<string, Album[]> = {}

    albums.forEach(album => {
      let countryCode = album.country_code

      // If no country code, try to extract from location_name
      if (!countryCode && album.location_name) {
        const extracted = extractCountryFromLocation(album.location_name)
        if (extracted) {
          countryCode = extracted
        }
      }

      // Skip albums without country data
      if (!countryCode) return

      if (!grouped[countryCode]) {
        grouped[countryCode] = []
      }
      grouped[countryCode].push(album)
    })

    // Sort countries by album count (most albums first)
    const sortedEntries = Object.entries(grouped).sort(
      ([, a], [, b]) => b.length - a.length
    )

    return sortedEntries
  }, [albums])

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return albumsByCountry

    const query = searchQuery.toLowerCase()
    return albumsByCountry.filter(([countryCode]) => {
      const countryName = getCountryName(countryCode).toLowerCase()
      return countryName.includes(query) || countryCode.toLowerCase().includes(query)
    })
  }, [albumsByCountry, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (albums.length === 0) {
    return (
      <div className="text-center py-16">
        <MapPin className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Albums Yet
        </h3>
        <p className="text-gray-600">
          Create your first album to see it organized by country here.
        </p>
      </div>
    )
  }

  if (filteredCountries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No countries found matching &quot;{searchQuery}&quot;</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          My Adventures by Country
        </h2>
        <p className="text-gray-600 mb-6">
          Browse your travel albums organized by the countries you&apos;ve visited.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for a country..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Country Sections */}
      <div className="space-y-4">
        {filteredCountries.map(([countryCode, countryAlbums]) => (
          <CountrySection
            key={countryCode}
            countryCode={countryCode}
            countryName={getCountryName(countryCode)}
            albums={countryAlbums}
            defaultExpanded={filteredCountries.length === 1 || filteredCountries.length <= 3}
          />
        ))}
      </div>
    </div>
  )
}
