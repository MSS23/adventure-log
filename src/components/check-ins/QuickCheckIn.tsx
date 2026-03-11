'use client'

import { useState, useCallback } from 'react'
import { useCreateCheckIn } from '@/lib/hooks/useCheckIns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { MapPin, Loader2, Navigation, Smile, Globe, Lock, Users, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import type { CheckInMood } from '@/types/database'

const MOODS: { value: CheckInMood; emoji: string; label: string }[] = [
  { value: 'amazing', emoji: '\uD83E\uDD29', label: 'Amazing' },
  { value: 'happy', emoji: '\uD83D\uDE0A', label: 'Happy' },
  { value: 'relaxed', emoji: '\uD83D\uDE0C', label: 'Relaxed' },
  { value: 'exploring', emoji: '\uD83E\uDDD0', label: 'Exploring' },
  { value: 'adventurous', emoji: '\uD83E\uDD20', label: 'Adventurous' },
  { value: 'tired', emoji: '\uD83D\uDE34', label: 'Tired' },
]

interface QuickCheckInProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickCheckIn({ open, onOpenChange, onSuccess }: QuickCheckInProps) {
  const createCheckIn = useCreateCheckIn()
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [formData, setFormData] = useState({
    location_name: '',
    location_address: '',
    latitude: 0,
    longitude: 0,
    country_code: '',
    note: '',
    mood: '' as CheckInMood | '',
    photo_url: '',
    visibility: 'public' as 'public' | 'friends' | 'private',
  })

  const resetForm = useCallback(() => {
    setFormData({
      location_name: '',
      location_address: '',
      latitude: 0,
      longitude: 0,
      country_code: '',
      note: '',
      mood: '',
      photo_url: '',
      visibility: 'public',
    })
    setGeoError('')
  }, [])

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.')
      return
    }

    setDetectingLocation(true)
    setGeoError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setFormData((prev) => ({ ...prev, latitude, longitude }))

        // Reverse geocode using the app's API
        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lng=${longitude}`)
          if (response.ok) {
            const data = await response.json()
            setFormData((prev) => ({
              ...prev,
              location_name: data.location_name || prev.location_name,
              location_address: data.address || '',
              country_code: data.country_code || '',
            }))
          }
        } catch {
          // Fallback: try Nominatim directly
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`
            )
            const data = await response.json()
            if (data.display_name) {
              const parts = data.display_name.split(', ')
              const shortName = parts.length > 2
                ? `${parts[0]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
                : data.display_name
              setFormData((prev) => ({ ...prev, location_name: shortName }))
            }
          } catch {
            log.info('Reverse geocoding failed', { component: 'QuickCheckIn' })
          }
        }
        setDetectingLocation(false)
      },
      (err) => {
        setDetectingLocation(false)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError('Location permission denied. Please enable location access.')
            break
          case err.POSITION_UNAVAILABLE:
            setGeoError('Location information is unavailable.')
            break
          case err.TIMEOUT:
            setGeoError('Location request timed out. Please try again.')
            break
          default:
            setGeoError('Failed to detect location.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const handleSubmit = async () => {
    if (!formData.location_name || formData.latitude === 0) return

    try {
      await createCheckIn.mutateAsync({
        location_name: formData.location_name,
        location_address: formData.location_address || undefined,
        latitude: formData.latitude,
        longitude: formData.longitude,
        country_code: formData.country_code || undefined,
        note: formData.note || undefined,
        mood: formData.mood || undefined,
        photo_url: formData.photo_url || undefined,
        visibility: formData.visibility,
      })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      log.error('Failed to create check-in', { component: 'QuickCheckIn' }, error)
    }
  }

  const visibilityOptions = [
    { value: 'public' as const, icon: Globe, label: 'Public' },
    { value: 'friends' as const, icon: Users, label: 'Friends' },
    { value: 'private' as const, icon: Lock, label: 'Private' },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetForm()
      onOpenChange(o)
    }}>
      <DialogContent className="sm:max-w-md dark:bg-stone-900 dark:border-stone-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-900 dark:text-white">
            <MapPin className="h-5 w-5 text-amber-500" />
            Quick Check-in
          </DialogTitle>
          <DialogDescription>
            Drop a pin at your current location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Location Detection */}
          <Button
            type="button"
            variant="outline"
            onClick={detectLocation}
            disabled={detectingLocation}
            className="w-full gap-2 rounded-xl border-dashed border-2 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            {detectingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {detectingLocation ? 'Detecting location...' : 'Use Current Location'}
          </Button>

          {geoError && (
            <p className="text-sm text-red-500">{geoError}</p>
          )}

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.location_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, location_name: e.target.value }))}
              placeholder="Where are you?"
              className="rounded-xl dark:bg-stone-800 dark:border-stone-700"
            />
            {formData.latitude !== 0 && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                {formData.country_code && ` (${formData.country_code})`}
              </p>
            )}
          </div>

          {/* Mood Selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Smile className="h-4 w-4" /> How are you feeling?
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      mood: prev.mood === mood.value ? '' : mood.value,
                    }))
                  }
                  className={cn(
                    'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all',
                    formData.mood === mood.value
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                  )}
                >
                  <span className="text-xl">{mood.emoji}</span>
                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="What are you up to?"
              className="rounded-xl min-h-[60px] dark:bg-stone-800 dark:border-stone-700"
              rows={2}
            />
          </div>

          {/* Photo URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" /> Photo URL (optional)
            </Label>
            <Input
              value={formData.photo_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, photo_url: e.target.value }))}
              placeholder="https://example.com/photo.jpg"
              className="rounded-xl dark:bg-stone-800 dark:border-stone-700"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="flex gap-2">
              {visibilityOptions.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, visibility: value }))}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                    formData.visibility === value
                      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700'
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createCheckIn.isPending || !formData.location_name || formData.latitude === 0}
            className="gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25"
          >
            {createCheckIn.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Default export for backward compatibility
export default QuickCheckIn
