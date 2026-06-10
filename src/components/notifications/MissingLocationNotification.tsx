'use client'

import { useState } from 'react'
import { useAlbumLocationData } from '@/lib/hooks/useAlbumLocationData'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  X,
  AlertTriangle,
  ChevronRight,
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
      <div className={cn("flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/10", className)}>
        <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            {stats.albumsWithoutLocation} album{stats.albumsWithoutLocation === 1 ? '' : 's'} missing location
          </p>
        </div>
        <Link href={recentMissingAlbums[0] ? `${recentMissingAlbums[0].albumUrl}/edit` : '/globe'}>
          <Button variant="outline" size="sm">
            Fix Now
          </Button>
        </Link>
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn(
      "relative overflow-hidden",
      severity === 'high' ? "bg-destructive/5" : "bg-primary/5",
      className
    )}>
      {/* Severity rail */}
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          severity === 'high' ? "bg-destructive" : "bg-primary"
        )}
        aria-hidden
      />
      <CardContent className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn(
              "p-2 rounded-full flex-shrink-0",
              severity === 'high' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}>
              <MapPin className="h-4 w-4" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-semibold text-foreground">
                  Missing Location Data
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    severity === 'high'
                      ? "border-destructive/20 text-destructive bg-destructive/10"
                      : "border-primary/20 text-primary bg-primary/10"
                  )}
                >
                  {stats.albumsWithoutLocation} album{stats.albumsWithoutLocation === 1 ? '' : 's'}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {stats.albumsWithoutLocation === 1
                  ? '1 album is missing location data and won\'t appear on the globe.'
                  : `${stats.albumsWithoutLocation} albums are missing location data and won't appear on the globe.`}
                {' '}Add locations to see them as pins on your travel map.
              </p>

              {/* Progress indicator */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono tracking-wide text-muted-foreground">
                  <span>Globe Coverage</span>
                  <span>{stats.percentageWithLocation}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      severity === 'high' ? "bg-destructive" : "bg-primary"
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
                    className="p-0 h-auto font-normal text-sm text-muted-foreground hover:text-foreground hover:bg-transparent"
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
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {album.title}
                            </p>
                            <p className="text-xs font-mono tracking-wide text-muted-foreground">
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
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Link href="/globe">
            <Button
              size="sm"
              variant={severity === 'high' ? 'destructive' : 'default'}
            >
              <MapPin className="h-4 w-4 mr-1" />
              View Analysis
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