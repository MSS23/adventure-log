'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/types/database'
import { CountrySection } from '@/components/countries/CountrySection'
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

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Enhanced Page Header */}
          <div className="mb-8 sm:mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl shadow-lg">
                <Globe className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Adventures by Country
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mt-1">
                  {albums.length > 0
                    ? `${albums.length} albums across ${albumsByCountry.length} countries`
                    : 'Start your journey, one country at a time'}
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced Search Section */}
          <div className="mb-8 sm:mb-10">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Find a Country</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Search through {albumsByCountry.length} countries you've visited
                  </p>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Type to search countries..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all duration-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                    {filteredCountries.length} result{filteredCountries.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Loading State */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded-lg w-32 animate-pulse mb-2" />
                      <div className="h-4 bg-gray-100 rounded-lg w-20 animate-pulse" />
                    </div>
                    <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Error State */}
          {error && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Oops! Something went wrong
              </h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Country Sections */}
          {!loading && !error && (
            <>
              {filteredCountries.length > 0 ? (
                <div className="space-y-3">
                  {/* Results Summary */}
                  {!searchQuery && albumsByCountry.length > 0 && (
                    <div className="flex items-center justify-between px-2 mb-2">
                      <p className="text-sm text-gray-600 font-medium">
                        {albumsByCountry.length} Countries Visited
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-full font-medium">
                          {albums.length} albums total
                        </span>
                      </div>
                    </div>
                  )}

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
                // Enhanced No Search Results
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No matches found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    We couldn't find any countries matching "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-teal-600 hover:text-teal-700 font-medium text-sm transition-colors"
                  >
                    Clear search and show all countries
                  </button>
                </div>
              ) : albums.length === 0 ? (
                // Enhanced No Albums State
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Camera className="h-12 w-12 text-teal-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    Start Your Adventure
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Your travel story begins here. Create your first album and watch your world map come to life.
                  </p>
                  <Link href="/albums/new">
                    <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all">
                      <Camera className="h-5 w-5 mr-2" />
                      Create Your First Album
                    </Button>
                  </Link>
                </div>
              ) : (
                // Albums exist but no countries (shouldn't happen)
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Globe className="h-10 w-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Location Data Missing
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Your albums don't have country information yet. Add location details to see them organized here.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
