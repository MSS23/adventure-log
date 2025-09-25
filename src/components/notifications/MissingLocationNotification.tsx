'use client'

import { useState, useEffect } from 'react'
import { useAlbumLocationData } from '@/lib/hooks/useAlbumLocationData'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  X,
  AlertTriangle,
  ChevronRight,
  Globe,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MissingLocationNotificationProps {
  className?: string
  showOnlyIfMissing?: boolean
  maxRecentToShow?: number
  dismissible?: boolean
  compact?: boolean
}

export function MissingLocationNotification({
  className,
  showOnlyIfMissing = true,
  maxRecentToShow = 3,
  dismissible = true,
  compact = false
}: MissingLocationNotificationProps) {
  const { stats, loading } = useAlbumLocationData()
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  // Don't show if loading or no stats
  if (loading || !stats) return null

  // Don't show if no missing locations and showOnlyIfMissing is true
  if (showOnlyIfMissing && stats.albumsWithoutLocation === 0) return null

  // Don't show if dismissed
  if (dismissed) return null

  // Determine severity level
  const severity = stats.percentageWithLocation < 25 ? 'high' :
                   stats.percentageWithLocation < 50 ? 'medium' : 'low'

  const recentMissingAlbums = stats.recentAlbumsWithoutLocation.slice(0, maxRecentToShow)

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg", className)}>
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-800">
            {stats.albumsWithoutLocation} album{stats.albumsWithoutLocation === 1 ? '' : 's'} missing location
          </p>
        </div>
        <Link href="/globe/location-analysis">
          <Button variant="outline" size="sm" className="text-amber-700 border-amber-300 hover:bg-amber-100">
            Fix Now
          </Button>
        </Link>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-200"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn(
      "border-l-4",
      severity === 'high' ? "border-l-red-500 bg-red-50 border-red-200" :
      severity === 'medium' ? "border-l-amber-500 bg-amber-50 border-amber-200" :
      "border-l-blue-500 bg-blue-50 border-blue-200",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              "p-2 rounded-lg flex-shrink-0",
              severity === 'high' ? "bg-red-100 text-red-600" :
              severity === 'medium' ? "bg-amber-100 text-amber-600" :
              "bg-blue-100 text-blue-600"
            )}>
              <MapPin className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-medium",
                  severity === 'high' ? "text-red-800" :
                  severity === 'medium' ? "text-amber-800" :
                  "text-blue-800"
                )}>
                  Missing Location Data
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    severity === 'high' ? "border-red-300 text-red-700" :
                    severity === 'medium' ? "border-amber-300 text-amber-700" :
                    "border-blue-300 text-blue-700"
                  )}
                >
                  {stats.albumsWithoutLocation} album{stats.albumsWithoutLocation === 1 ? '' : 's'}
                </Badge>
              </div>

              <p className={cn(
                "text-sm",
                severity === 'high' ? "text-red-700" :
                severity === 'medium' ? "text-amber-700" :
                "text-blue-700"
              )}>
                {stats.albumsWithoutLocation === 1
                  ? '1 album is missing location data and won\'t appear on the globe.'
                  : `${stats.albumsWithoutLocation} albums are missing location data and won't appear on the globe.`}
                {' '}Add locations to see them as pins on your travel map.
              </p>

              {/* Progress indicator */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Globe Coverage</span>
                  <span>{stats.percentageWithLocation}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      severity === 'high' ? "bg-red-500" :
                      severity === 'medium' ? "bg-amber-500" :
                      "bg-blue-500"
                    )}
                    style={{ width: `${stats.percentageWithLocation}%` }}
                  />
                </div>
              </div>

              {/* Recent albums missing location */}
              {recentMissingAlbums.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="p-0 h-auto font-normal text-sm text-gray-600 hover:text-gray-800"
                  >
                    <span className="flex items-center gap-1">
                      {expanded ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      {expanded ? 'Hide' : 'Show'} recent albums
                    </span>
                  </Button>

                  {expanded && (
                    <div className="space-y-1">
                      {recentMissingAlbums.map((album) => (
                        <div
                          key={album.id}
                          className="flex items-center justify-between p-2 bg-white/50 rounded border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {album.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(album.createdAt).toLocaleDateString()} • {album.photoCount} photos
                            </p>
                          </div>
                          <Link href={`${album.albumUrl}/edit`}>
                            <Button variant="outline" size="sm" className="ml-2">
                              Add Location
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissed(true)}
              className={cn(
                "h-6 w-6 p-0 flex-shrink-0",
                severity === 'high' ? "text-red-600 hover:bg-red-200" :
                severity === 'medium' ? "text-amber-600 hover:bg-amber-200" :
                "text-blue-600 hover:bg-blue-200"
              )}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Link href="/globe/location-analysis">
            <Button
              size="sm"
              className={cn(
                severity === 'high' ? "bg-red-600 hover:bg-red-700 text-white" :
                severity === 'medium' ? "bg-amber-600 hover:bg-amber-700 text-white" :
                "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              <MapPin className="h-4 w-4 mr-1" />
              View Analysis
            </Button>
          </Link>

          <Link href="/globe">
            <Button variant="outline" size="sm">
              <Globe className="h-4 w-4 mr-1" />
              Open Globe
            </Button>
          </Link>

          {recentMissingAlbums.length > 0 && (
            <Link href={`${recentMissingAlbums[0].albumUrl}/edit`}>
              <Button variant="outline" size="sm">
                Fix First Album
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function MissingLocationBanner({ className }: { className?: string }) {
  return (
    <MissingLocationNotification
      className={className}
      compact={true}
      dismissible={false}
      showOnlyIfMissing={true}
    />
  )
}