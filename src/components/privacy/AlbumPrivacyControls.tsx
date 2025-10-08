/**
 * Album Privacy Controls Component
 * Controls for hiding exact coordinates and delayed posting
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, Eye, EyeOff, Info } from 'lucide-react'
import type { LocationPrecision } from '@/types/database'

interface AlbumPrivacyControlsProps {
  hideExactLocation?: boolean
  locationPrecision?: LocationPrecision
  publishDelayHours?: number
  onPrivacyChange: (settings: {
    hide_exact_location: boolean
    location_precision: LocationPrecision
    publish_delay_hours: number
    scheduled_publish_at?: string
    is_delayed_publish: boolean
  }) => void
}

export function AlbumPrivacyControls({
  hideExactLocation = false,
  locationPrecision = 'exact',
  publishDelayHours = 0,
  onPrivacyChange
}: AlbumPrivacyControlsProps) {
  const [hideLocation, setHideLocation] = useState(hideExactLocation)
  const [precision, setPrecision] = useState<LocationPrecision>(locationPrecision)
  const [delayHours, setDelayHours] = useState(publishDelayHours)

  const handleLocationToggle = (enabled: boolean) => {
    setHideLocation(enabled)
    
    // If hiding location, default to neighbourhood level
    const newPrecision = enabled ? 'neighbourhood' : 'exact'
    setPrecision(newPrecision)
    
    emitChanges(enabled, newPrecision, delayHours)
  }

  const handlePrecisionChange = (newPrecision: LocationPrecision) => {
    setPrecision(newPrecision)
    emitChanges(hideLocation, newPrecision, delayHours)
  }

  const handleDelayChange = (hours: number) => {
    setDelayHours(hours)
    emitChanges(hideLocation, precision, hours)
  }

  const emitChanges = (
    hide: boolean, 
    prec: LocationPrecision, 
    delay: number
  ) => {
    const scheduledPublishAt = delay > 0
      ? new Date(Date.now() + delay * 60 * 60 * 1000).toISOString()
      : undefined

    onPrivacyChange({
      hide_exact_location: hide,
      location_precision: prec,
      publish_delay_hours: delay,
      scheduled_publish_at: scheduledPublishAt,
      is_delayed_publish: delay > 0
    })
  }

  const getPrecisionDescription = (prec: LocationPrecision) => {
    switch (prec) {
      case 'exact':
        return 'Show exact GPS coordinates'
      case 'neighbourhood':
        return 'Show approximate area (~1km radius)'
      case 'city':
        return 'Show only city name (~10km radius)'
      case 'country':
        return 'Show only country'
      case 'hidden':
        return 'Completely hide location'
      default:
        return ''
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control what location information is shared and when your album is published
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Privacy */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hide-location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Hide Exact Coordinates
              </Label>
              <p className="text-sm text-muted-foreground">
                Protect your privacy while travelling
              </p>
            </div>
            <Switch
              id="hide-location"
              checked={hideLocation}
              onCheckedChange={handleLocationToggle}
            />
          </div>

          {hideLocation && (
            <div className="ml-6 space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="location-precision">Location Precision</Label>
              <Select
                value={precision}
                onValueChange={(value) => handlePrecisionChange(value as LocationPrecision)}
              >
                <SelectTrigger id="location-precision">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neighbourhood">
                    <div className="flex flex-col">
                      <span>Neighbourhood</span>
                      <span className="text-xs text-muted-foreground">~1km radius</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="city">
                    <div className="flex flex-col">
                      <span>City Only</span>
                      <span className="text-xs text-muted-foreground">~10km radius</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="country">
                    <div className="flex flex-col">
                      <span>Country Only</span>
                      <span className="text-xs text-muted-foreground">Very general</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hidden">
                    <div className="flex flex-col">
                      <span>Hidden</span>
                      <span className="text-xs text-muted-foreground">No location shown</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900">
                  {getPrecisionDescription(precision)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Delayed Publishing */}
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="publish-delay" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Delayed Publishing
            </Label>
            <p className="text-sm text-muted-foreground">
              Wait before making this album public (safety while travelling)
            </p>
          </div>

          <div className="space-y-2">
            <Select
              value={delayHours.toString()}
              onValueChange={(value) => handleDelayChange(parseInt(value))}
            >
              <SelectTrigger id="publish-delay">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Publish immediately</SelectItem>
                <SelectItem value="24">Publish in 24 hours</SelectItem>
                <SelectItem value="48">Publish in 48 hours</SelectItem>
                <SelectItem value="72">Publish in 3 days</SelectItem>
                <SelectItem value="168">Publish in 1 week</SelectItem>
                <SelectItem value="336">Publish in 2 weeks</SelectItem>
              </SelectContent>
            </Select>

            {delayHours > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-md border border-amber-200 animate-in fade-in slide-in-from-top-2">
                <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-amber-900 font-medium">
                    Scheduled for {new Date(Date.now() + delayHours * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    This album will remain private until then
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Privacy Summary */}
        <div className="border-t pt-4">
          <Label className="text-sm font-medium mb-2 block">Privacy Summary</Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant={hideLocation ? 'default' : 'secondary'}>
              {hideLocation ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Location Protected
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Exact Location
                </>
              )}
            </Badge>
            {delayHours > 0 && (
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                Delayed {delayHours}h
              </Badge>
            )}
            {!hideLocation && delayHours === 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                Public & Immediate
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

