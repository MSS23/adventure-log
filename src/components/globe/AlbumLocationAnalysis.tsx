'use client'

import { useState } from 'react'
import { useAlbumLocationData, type AlbumLocationInfo } from '@/lib/hooks/useAlbumLocationData'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MapPin,
  Map,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Plus,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AlbumLocationAnalysisProps {
  className?: string
}

export function AlbumLocationAnalysis({ className }: AlbumLocationAnalysisProps) {
  const { stats, loading, error, refreshData, getAlbumsByLocationStatus } = useAlbumLocationData()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshData()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Analyzing album location data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Album Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No album data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const albumsWithLocation = getAlbumsByLocationStatus(true)
  const albumsWithoutLocation = getAlbumsByLocationStatus(false)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5 text-blue-600" />
              Album Location Analysis
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalAlbums}</div>
              <div className="text-sm text-gray-600">Total Albums</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.albumsWithLocation}</div>
              <div className="text-sm text-gray-600">With Location</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.albumsWithoutLocation}</div>
              <div className="text-sm text-gray-600">Missing Location</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.percentageWithLocation}%</div>
              <div className="text-sm text-gray-600">Coverage</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Location Coverage</span>
              <span>{stats.percentageWithLocation}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${stats.percentageWithLocation}%` }}
              />
            </div>
          </div>

          {stats.albumsWithoutLocation > 0 && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800">Action Needed</span>
              </div>
              <p className="text-amber-700 text-sm">
                {stats.albumsWithoutLocation} album{stats.albumsWithoutLocation === 1 ? '' : 's'} won't appear on the globe
                because {stats.albumsWithoutLocation === 1 ? 'it lacks' : 'they lack'} location coordinates.
                Add locations to see {stats.albumsWithoutLocation === 1 ? 'it' : 'them'} as pins.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Album Lists */}
      <Tabs defaultValue="missing" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="missing" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Missing Location ({stats.albumsWithoutLocation})
          </TabsTrigger>
          <TabsTrigger value="complete" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Has Location ({stats.albumsWithLocation})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="space-y-4">
          {albumsWithoutLocation.length === 0 ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-800 mb-2">All Set!</h3>
                  <p className="text-green-600">All your albums have location data and will appear on the globe.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {albumsWithoutLocation.map((album) => (
                <AlbumCard key={album.id} album={album} showLocationStatus={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="complete" className="space-y-4">
          {albumsWithLocation.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No albums with location data yet.</p>
                  <Link href="/albums/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Album with Location
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {albumsWithLocation.map((album) => (
                <AlbumCard key={album.id} album={album} showLocationStatus={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface AlbumCardProps {
  album: AlbumLocationInfo
  showLocationStatus?: boolean
}

function AlbumCard({ album, showLocationStatus = false }: AlbumCardProps) {
  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      !album.hasCoordinates ? "border-amber-200 bg-amber-50/30" : ""
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Album Thumbnail */}
          <div className="flex-shrink-0">
            {album.photoUrls.length > 0 ? (
              <div className="relative">
                <img
                  src={album.photoUrls[0]}
                  alt={album.title}
                  className="w-16 h-16 object-cover rounded-lg border"
                />
                {album.photoUrls.length > 1 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-2 text-xs h-5 w-5 p-0 flex items-center justify-center"
                  >
                    +{album.photoUrls.length - 1}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Album Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">{album.title}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {album.photoCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(album.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {showLocationStatus && (
                  <div className="mt-2">
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Missing Location
                    </Badge>
                  </div>
                )}

                {!showLocationStatus && album.hasCoordinates && (
                  <div className="mt-2 space-y-1">
                    {album.locationName && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {album.locationName}
                        {album.countryCode && (
                          <Badge variant="outline" className="text-xs ml-1">
                            {album.countryCode}
                          </Badge>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {album.latitude?.toFixed(6)}, {album.longitude?.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Link href={album.albumUrl}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
                {showLocationStatus && (
                  <Link href={`${album.albumUrl}/edit`}>
                    <Button variant="outline" size="sm">
                      <MapPin className="h-4 w-4 mr-1" />
                      Add Location
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { type AlbumLocationInfo }