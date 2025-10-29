'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/types/database'
import { CountrySection } from '@/components/countries/CountrySection'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getCountryName, extractCountryFromLocation } from '@/lib/utils/country'
import { Search, Camera, Globe, Plus } from 'lucide-react'
import { log } from '@/lib/utils/logger'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserNav } from '@/components/layout/UserNav'

export default function CountriesPage() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAlbums = async () => {
      if (!user) return

      const supabase = createClient()

      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('albums')
          .select('*')
          .eq('user_id', user.id)
          .neq('status', 'draft')
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw new Error('Failed to fetch albums')
        }

        log.info('Albums fetched for countries view', {
          component: 'CountriesPage',
          count: data?.length || 0,
          userId: user.id
        })

        setAlbums(data || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load albums'
        setError(errorMessage)
        log.error('Error fetching albums', { component: 'CountriesPage', userId: user.id }, err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchAlbums()
  }, [user])

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
    <div className="min-h-screen bg-white">
      {/* Custom Header with Text Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-white border-gray-200 shadow-sm">
        <div className="flex items-center justify-between gap-4 h-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
          {/* Left: Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/feed" className="cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AL</span>
                </div>
                <span className="text-lg sm:text-xl font-semibold text-gray-900 whitespace-nowrap hidden sm:block">
                  Adventure Log
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Text Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/feed"
              className={cn(
                "text-sm font-medium transition-colors hover:text-teal-600",
                pathname === '/feed' ? "text-teal-600" : "text-gray-700"
              )}
            >
              Home
            </Link>
            <Link
              href="/countries"
              className={cn(
                "text-sm font-medium transition-colors hover:text-teal-600",
                pathname === '/countries' ? "text-teal-600" : "text-gray-700"
              )}
            >
              Countries
            </Link>
            <Link
              href="/globe"
              className={cn(
                "text-sm font-medium transition-colors hover:text-teal-600",
                pathname === '/globe' ? "text-teal-600" : "text-gray-700"
              )}
            >
              Map View
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                "text-sm font-medium transition-colors hover:text-teal-600",
                pathname === '/dashboard' ? "text-teal-600" : "text-gray-700"
              )}
            >
              Profile
            </Link>
          </nav>

          {/* Right: New Album Button and User Avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href="/albums/new">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-4">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Album</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
            <UserNav />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Adventures by Country
          </h1>
          <p className="text-gray-600">
            Browse your travel albums organized by the countries you&apos;ve visited.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
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

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-white rounded-lg border border-gray-200 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium mb-2">Failed to load albums</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Country Sections */}
        {!loading && !error && (
          <>
            {filteredCountries.length > 0 ? (
              <div className="space-y-4">
                {filteredCountries.map(([countryCode, countryAlbums]) => {
                  const countryName = countryCode === 'UNKNOWN'
                    ? 'Unknown'
                    : getCountryName(countryCode)

                  return (
                    <CountrySection
                      key={countryCode}
                      countryCode={countryCode}
                      countryName={countryName}
                      albums={countryAlbums}
                      defaultExpanded={filteredCountries.length === 1}
                    />
                  )
                })}
              </div>
            ) : searchQuery.trim() ? (
              // No search results
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Search className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-2">No countries found</p>
                <p className="text-gray-500 text-sm">
                  Try searching for a different country name
                </p>
              </div>
            ) : albums.length === 0 ? (
              // No albums at all
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Camera className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-2">No albums yet</p>
                <p className="text-gray-500 text-sm mb-4">
                  Create your first album to see it organized by country here
                </p>
                <Link href="/albums/new">
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                    <Camera className="h-4 w-4 mr-2" />
                    Create Your First Album
                  </Button>
                </Link>
              </div>
            ) : (
              // Albums exist but no countries (shouldn't happen)
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Globe className="h-16 w-16 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 mb-2">No countries found</p>
                <p className="text-gray-500 text-sm">
                  Your albums don&apos;t have country information yet
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
