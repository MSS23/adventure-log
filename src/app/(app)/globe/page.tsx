'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Globe as GlobeIcon,
  MapPin,
  Camera,
  Plus,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Dynamically import the Globe component to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

interface CountryData {
  country_code: string
  country_name: string
  album_count: number
  photo_count: string
  lat: number
  lng: number
  albums: Array<{
    id: string
    title: string
    photo_count: number
  }>
}


export default function GlobePage() {
  const { user } = useAuth()
  const [countryData, setCountryData] = useState<CountryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null)
  const [globeReady, setGlobeReady] = useState(false)
  const supabase = createClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user) {
      fetchTravelData()
    }
  }, [user])

  const fetchTravelData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch albums with country data
      const { data: albums, error: albumsError } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          country_code,
          country_name,
          latitude,
          longitude,
          photos!inner(id)
        `)
        .eq('user_id', user?.id)
        .not('country_code', 'is', null)

      if (albumsError) throw albumsError

      // Group by country
      const countryMap = new Map<string, CountryData>()

      albums?.forEach(album => {
        const countryCode = album.country_code
        if (!countryCode) return

        if (!countryMap.has(countryCode)) {
          countryMap.set(countryCode, {
            country_code: countryCode,
            country_name: album.country_name || countryCode,
            album_count: 0,
            photo_count: '0',
            lat: album.latitude || 0,
            lng: album.longitude || 0,
            albums: []
          })
        }

        const country = countryMap.get(countryCode)!
        country.album_count += 1
        country.photo_count = String(Number(country.photo_count) + (album.photos?.length || 0))
        country.albums.push({
          id: album.id,
          title: album.title,
          photo_count: album.photos?.length || 0
        })
      })

      setCountryData(Array.from(countryMap.values()))
    } catch (err) {
      console.error('Error fetching travel data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch travel data')
    } finally {
      setLoading(false)
    }
  }

  const handleCountryClick = (country: CountryData) => {
    setSelectedCountry(country)
    // Globe focusing functionality disabled due to type compatibility issues
  }

  const resetGlobe = () => {
    // Globe reset functionality disabled due to type compatibility issues
    setSelectedCountry(null)
  }

  const zoomIn = () => {
    // Globe zoom functionality disabled due to type compatibility issues
    console.log('Zoom in functionality temporarily disabled')
  }

  const zoomOut = () => {
    // Globe zoom functionality disabled due to type compatibility issues
    console.log('Zoom out functionality temporarily disabled')
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <h2 className="text-xl font-semibold mt-4">Loading your adventures...</h2>
          <p className="text-gray-600 mt-2">Preparing your 3D globe visualization</p>
        </div>
      </div>
    )
  }

  // Don't return early on error - always render the globe!

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <GlobeIcon className="h-8 w-8 text-blue-600" />
            Adventure Globe
          </h1>
          <p className="text-gray-600 mt-2">
            Explore your travels on an interactive 3D globe
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetGlobe}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
          <Link href="/albums/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Adventure
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Message (if any) */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">Unable to load travel data</p>
              <p className="text-red-500 text-sm mt-1">{error}</p>
              <Button variant="outline" onClick={fetchTravelData} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {countryData.length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Countries Visited</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {countryData.reduce((sum, country) => sum + country.album_count, 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Travel Albums</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {countryData.reduce((sum, country) => sum + Number(country.photo_count), 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Adventure Photos</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Always show the globe - it's beautiful even without pins! */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Globe */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Interactive Globe</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={zoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={zoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  Click on a country to explore your adventures there
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="globe-container bg-gradient-to-br from-blue-900 to-purple-900 h-[500px] md:h-[500px] rounded-lg overflow-hidden relative flex items-center justify-center">
                  <Globe
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                    backgroundColor="#0f1729"
                    width={800}
                    height={500}
                    showAtmosphere={true}
                    atmosphereColor="rgba(135, 206, 250, 0.8)"
                    atmosphereAltitude={0.25}
                    pointsData={countryData}
                    pointLat="lat"
                    pointLng="lng"
                    pointColor={() => '#ff4444'}
                    pointAltitude={0.15}
                    pointRadius={1.2}
                    pointResolution={6}
                    pointLabel={(point: object) => {
                      const countryPoint = point as CountryData
                      return `
                        <div class="bg-white p-2 rounded-lg shadow-lg border">
                          <h4 class="font-bold text-gray-900">${countryPoint.country_name}</h4>
                          <p class="text-sm text-gray-600">${countryPoint.album_count} albums • ${countryPoint.photo_count} photos</p>
                        </div>
                      `
                    }}
                    onPointClick={(point: object) => handleCountryClick(point as CountryData)}
                    onGlobeReady={() => setGlobeReady(true)}
                    enablePointerInteraction={true}
                  />
                  {!globeReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Country Details */}
          <div className="space-y-6">
            {selectedCountry ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    {selectedCountry.country_name}
                  </CardTitle>
                  <CardDescription>
                    Your adventures in this country
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedCountry.album_count}
                      </div>
                      <div className="text-xs text-gray-600">Albums</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedCountry.photo_count}
                      </div>
                      <div className="text-xs text-gray-600">Photos</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Albums</h4>
                    {selectedCountry.albums.map((album) => (
                      <Link key={album.id} href={`/albums/${album.id}`}>
                        <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 line-clamp-1">
                              {album.title}
                            </span>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              {album.photo_count}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <GlobeIcon className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600">
                      {countryData.length === 0
                        ? 'Start your adventure! Create albums with location data to see pins on the globe.'
                        : 'Click on a country on the globe to see your adventures there'
                      }
                    </p>
                    {countryData.length === 0 && (
                      <div className="mt-4">
                        <Link href="/albums/new">
                          <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Album
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Countries List */}
            <Card>
              <CardHeader>
                <CardTitle>Countries Visited</CardTitle>
                <CardDescription>
                  {countryData.length === 0
                    ? 'No countries visited yet - start your adventure!'
                    : 'All countries where you have adventures'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {countryData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      Create albums with photos that have location data to see your travels here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {countryData.map((country) => (
                      <button
                        key={country.country_code}
                        onClick={() => handleCountryClick(country)}
                        className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {country.country_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {country.album_count} albums
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
  )
}