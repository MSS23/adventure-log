'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTravelTimeline } from '@/lib/hooks/useTravelTimeline'
import { useFlightAnimation } from '@/lib/hooks/useFlightAnimation'
import { TimelineControls } from './TimelineControls'
import { FlightAnimation } from './FlightAnimation'
import { CityPinSystem, formatPinTooltip, type CityPin, type CityCluster } from './CityPinSystem'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Globe as GlobeIcon,
  MapPin,
  Plus,
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Plane
} from 'lucide-react'
import Link from 'next/link'

// Dynamically import the Globe component to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false })

interface EnhancedGlobeProps {
  className?: string
}

export function EnhancedGlobe({ className }: EnhancedGlobeProps) {
  const globeRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [globeReady, setGlobeReady] = useState(false)
  const [selectedCluster, setSelectedCluster] = useState<CityCluster | null>(null)
  const [activeCityId, setActiveCityId] = useState<string | null>(null)

  // Travel timeline hook
  const {
    availableYears,
    loading: timelineLoading,
    error: timelineError,
    selectedYear,
    setSelectedYear,
    refreshData,
    getYearData
  } = useTravelTimeline()

  // Flight animation hook
  const {
    isPlaying,
    currentFlightState,
    progress,
    cameraPosition,
    play,
    pause,
    reset,
    setSpeed,
    setLocations,
    seekToSegment,
    speed,
    totalDuration
  } = useFlightAnimation({
    autoPlay: false,
    defaultSpeed: 1,
    cameraFollowsPlane: true,
    onSegmentComplete: (location) => {
      setActiveCityId(location.id)
    },
    onAnimationComplete: () => {
      console.log('Flight animation completed!')
    },
    onError: (error) => {
      console.error('Flight animation error:', error)
    }
  })

  // Get current year data
  const currentYearData = selectedYear ? getYearData(selectedYear) : null
  const locations = useMemo(() => currentYearData?.locations || [], [currentYearData])

  // Convert locations to city pins
  const cityPins: CityPin[] = locations.map(location => ({
    id: location.id,
    name: location.name,
    latitude: location.latitude,
    longitude: location.longitude,
    albumCount: location.albums.length,
    photoCount: location.photos.length,
    visitDate: location.visitDate.toISOString(),
    isVisited: true,
    isActive: activeCityId === location.id
  }))

  // Get city pin system data
  const cityPinSystem = CityPinSystem({
    cities: cityPins,
    onCityClick: handleCityClick,
    onClusterClick: handleClusterClick,
    activeCity: activeCityId
  })

  // Update flight animation when locations change
  useEffect(() => {
    if (locations.length > 1) {
      setLocations(locations)
    }
  }, [locations, setLocations])

  // Update camera position from flight animation
  useEffect(() => {
    if (cameraPosition && globeRef.current) {
      globeRef.current.pointOfView(cameraPosition, 1000)
    }
  }, [cameraPosition])

  function handleCityClick(city: CityPin) {
    setActiveCityId(city.id)
    if (globeRef.current) {
      globeRef.current.pointOfView({
        lat: city.latitude,
        lng: city.longitude,
        altitude: 1.5
      }, 1000)
    }
  }

  function handleClusterClick(cluster: CityCluster) {
    setSelectedCluster(cluster)
    if (globeRef.current) {
      globeRef.current.pointOfView({
        lat: cluster.latitude,
        lng: cluster.longitude,
        altitude: 1.2
      }, 1000)
    }
  }

  function handleYearChange(year: number) {
    setSelectedYear(year)
    setActiveCityId(null)
    reset()
  }

  function handlePlayPause() {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  function handleReset() {
    reset()
    setActiveCityId(null)
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000)
    }
  }

  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed)
  }

  function handleSeek(segment: number) {
    seekToSegment(segment)
    if (locations[segment]) {
      setActiveCityId(locations[segment].id)
    }
  }

  function zoomIn() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      globeRef.current.pointOfView({ ...pov, altitude: Math.max(0.5, pov.altitude * 0.8) }, 300)
    }
  }

  function zoomOut() {
    if (globeRef.current) {
      const pov = globeRef.current.pointOfView()
      globeRef.current.pointOfView({ ...pov, altitude: Math.min(5, pov.altitude * 1.2) }, 300)
    }
  }

  // Get current segment for timeline controls
  const currentSegment = locations[progress.currentSegment] ? {
    id: locations[progress.currentSegment].id,
    year: locations[progress.currentSegment].visitDate.getFullYear(),
    sequenceOrder: progress.currentSegment + 1,
    cityId: undefined,
    countryId: undefined,
    visitDate: locations[progress.currentSegment].visitDate.toISOString().split('T')[0],
    latitude: locations[progress.currentSegment].latitude,
    longitude: locations[progress.currentSegment].longitude,
    albumCount: locations[progress.currentSegment].albums.length,
    photoCount: locations[progress.currentSegment].photos.length,
    locationName: locations[progress.currentSegment].name
  } : null

  const timelineEntries = locations.map((location, index) => ({
    id: location.id,
    year: location.visitDate.getFullYear(),
    sequenceOrder: index + 1,
    cityId: undefined,
    countryId: undefined,
    visitDate: location.visitDate.toISOString().split('T')[0],
    latitude: location.latitude,
    longitude: location.longitude,
    albumCount: location.albums.length,
    photoCount: location.photos.length,
    locationName: location.name
  }))

  if (timelineLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <h2 className="text-xl font-semibold mt-4">Loading your travel timeline...</h2>
          <p className="text-gray-600 mt-2">Preparing flight animation data</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <GlobeIcon className="h-8 w-8 text-blue-600" />
            Adventure Globe
          </h1>
          <p className="text-gray-600 mt-2">
            Watch your travels unfold with cinematic flight animations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
          <Button variant="outline" size="sm" onClick={handlePlayPause} disabled={locations.length < 2}>
            {isPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isPlaying ? 'Pause' : 'Play'} Flight
          </Button>
          <Link href="/albums/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Adventure
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {timelineError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 font-medium">Unable to load travel timeline</p>
              <p className="text-red-500 text-sm mt-1">{timelineError}</p>
              <Button variant="outline" onClick={refreshData} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {currentYearData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {currentYearData.totalLocations}
                </div>
                <div className="text-sm text-gray-600 mt-1">Destinations</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {currentYearData.totalPhotos}
                </div>
                <div className="text-sm text-gray-600 mt-1">Photos</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {currentYearData.countries.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Countries</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {Math.round(currentYearData.totalDistance).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-1">KM Traveled</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Globe */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-600" />
                  Interactive Flight Globe
                </span>
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
                {selectedYear
                  ? `Flight animation for ${selectedYear} • ${locations.length} destinations`
                  : 'Select a year to begin your journey'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="globe-container bg-gradient-to-br from-blue-900 to-purple-900 h-[500px] md:h-[500px] rounded-lg overflow-hidden relative flex items-center justify-center">
                <Globe
                  ref={globeRef}
                  globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
                  backgroundColor="#0f1729"
                  width={800}
                  height={500}
                  showAtmosphere={true}
                  atmosphereColor="rgba(135, 206, 250, 0.8)"
                  atmosphereAltitude={0.25}

                  // City pins
                  htmlElementsData={cityPinSystem.pinData}
                  htmlLat={(d: object) => (d as any).lat} // eslint-disable-line @typescript-eslint/no-explicit-any
                  htmlLng={(d: object) => (d as any).lng} // eslint-disable-line @typescript-eslint/no-explicit-any
                  htmlAltitude={(d: object) => (d as any).size * 0.01} // eslint-disable-line @typescript-eslint/no-explicit-any
                  htmlElement={(d: object) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data = d as any
                    const el = document.createElement('div')
                    el.innerHTML = `
                      <div style="
                        width: ${data.size * 8}px;
                        height: ${data.size * 8}px;
                        background: ${data.color};
                        border: 2px solid white;
                        border-radius: 50%;
                        opacity: ${data.opacity};
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                      "></div>
                    `
                    el.style.pointerEvents = 'auto'
                    el.addEventListener('click', () => cityPinSystem.handlePinClick(data))
                    el.addEventListener('mouseenter', () => {
                      el.style.transform = 'scale(1.2)'
                    })
                    el.addEventListener('mouseleave', () => {
                      el.style.transform = 'scale(1)'
                    })

                    // Add tooltip
                    el.title = formatPinTooltip(data.cluster)

                    return el
                  }}

                  // Labels
                  labelsData={cityPinSystem.labelData}
                  labelLat={(d: object) => (d as any).lat} // eslint-disable-line @typescript-eslint/no-explicit-any
                  labelLng={(d: object) => (d as any).lng} // eslint-disable-line @typescript-eslint/no-explicit-any
                  labelText={(d: object) => (d as any).text} // eslint-disable-line @typescript-eslint/no-explicit-any
                  labelSize={(d: object) => (d as any).size} // eslint-disable-line @typescript-eslint/no-explicit-any
                  labelColor={(d: object) => (d as any).color} // eslint-disable-line @typescript-eslint/no-explicit-any

                  // Animation rings for active cities
                  ringsData={cityPinSystem.ringData}
                  ringLat={(d: object) => (d as any).lat} // eslint-disable-line @typescript-eslint/no-explicit-any
                  ringLng={(d: object) => (d as any).lng} // eslint-disable-line @typescript-eslint/no-explicit-any
                  ringMaxRadius={(d: object) => (d as any).maxR} // eslint-disable-line @typescript-eslint/no-explicit-any
                  ringPropagationSpeed={(d: object) => (d as any).propagationSpeed} // eslint-disable-line @typescript-eslint/no-explicit-any
                  ringRepeatPeriod={(d: object) => (d as any).repeatPeriod} // eslint-disable-line @typescript-eslint/no-explicit-any
                  ringColor={(d: object) => (d as any).color} // eslint-disable-line @typescript-eslint/no-explicit-any

                  onGlobeReady={() => setGlobeReady(true)}
                  enablePointerInteraction={true}
                />

                <FlightAnimation
                  globe={globeRef.current}
                  airplaneState={currentFlightState}
                  isActive={isPlaying}
                  trailColor="#00ff88"
                  airplaneScale={0.005}
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Flight Info */}
          {isPlaying && currentSegment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-600" />
                  Current Flight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{currentSegment.locationName}</p>
                    <p className="text-sm text-gray-600">
                      Segment {progress.currentSegment + 1} of {progress.totalSegments}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {Math.round(progress.overallProgress)}% Complete
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(progress.estimatedTimeRemaining)}s remaining
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected Cluster Details */}
          {selectedCluster && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {selectedCluster.cities.length > 1
                    ? `${selectedCluster.cities.length} Cities`
                    : selectedCluster.cities[0]?.name
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {selectedCluster.totalAlbums}
                      </div>
                      <div className="text-xs text-gray-600">Albums</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedCluster.totalPhotos}
                      </div>
                      <div className="text-xs text-gray-600">Photos</div>
                    </div>
                  </div>

                  {selectedCluster.cities.length > 1 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Cities in Cluster</h4>
                      {selectedCluster.cities.map((city) => (
                        <div key={city.id} className="p-2 border rounded text-sm">
                          <div className="font-medium">{city.name}</div>
                          <div className="text-gray-600">
                            {city.albumCount} albums • {city.photoCount} photos
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/albums/new">
                  <Button className="w-full justify-start">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Adventure
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveCityId(null)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={refreshData}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Timeline Controls */}
      {availableYears.length > 0 && (
        <TimelineControls
          availableYears={availableYears}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          isPlaying={isPlaying}
          onPlay={handlePlayPause}
          onPause={handlePlayPause}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          progress={{
            segment: progress.currentSegment,
            total: progress.totalSegments,
            percentage: progress.overallProgress
          }}
          onSeek={handleSeek}
          currentSegment={currentSegment}
          timeline={timelineEntries}
          totalDuration={totalDuration}
        />
      )}

      {/* No Data State */}
      {availableYears.length === 0 && !timelineLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <GlobeIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No travel data found</p>
              <p className="text-sm text-gray-600 mb-4">
                Start by creating albums with location data to see your adventures on the globe
              </p>
              <Link href="/albums/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Album
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}