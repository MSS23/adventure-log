'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Check, MapPin, Luggage } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'
import type { SavedPlace } from '@/lib/hooks/useSavedPlaces'

interface TripSummary {
  id: string
  title: string
  cover_emoji: string
  pin_count: number
  my_role: 'owner' | 'editor' | 'viewer'
}

interface AddToTripDialogProps {
  place: SavedPlace | null
  open: boolean
  onClose: () => void
}

export function AddToTripDialog({ place, open, onClose }: AddToTripDialogProps) {
  const [trips, setTrips] = useState<TripSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [addingTripId, setAddingTripId] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    setUnavailable(false)
    setLoadError(false)
    try {
      const res = await apiFetch('/api/trips')
      const data = await res.json().catch(() => ({}))
      if (res.status === 503 && data.code === 'NOT_PROVISIONED') {
        setUnavailable(true)
        return
      }
      if (!res.ok) {
        setLoadError(true)
        return
      }
      // Only trips the user can add pins to (owner or editor).
      setTrips((data.trips || []).filter((t: TripSummary) => t.my_role !== 'viewer'))
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setNewTitle('')
      setCreating(false)
      fetchTrips()
    }
  }, [open, fetchTrips])

  const addPinToTrip = useCallback(
    async (tripId: string): Promise<boolean> => {
      if (!place) return false
      const res = await apiFetch(`/api/trips/${tripId}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: place.place_name,
          latitude: place.latitude,
          longitude: place.longitude,
          address: place.location_name ?? undefined,
          source_url: place.source_url ?? undefined,
          category: place.category,
          note: place.notes ?? undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Could not add to trip')
      }
      return true
    },
    [place]
  )

  const handlePick = async (trip: TripSummary) => {
    setAddingTripId(trip.id)
    try {
      await addPinToTrip(trip.id)
      toast.success(`Added ${place?.place_name} to ${trip.title}`)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add to trip')
    } finally {
      setAddingTripId(null)
    }
  }

  const handleCreateAndAdd = async () => {
    const title = newTitle.trim()
    if (!title) {
      toast.error('Give your trip a name')
      return
    }
    setCreating(true)
    try {
      const res = await apiFetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 503 && data.code === 'NOT_PROVISIONED') {
        setUnavailable(true)
        return
      }
      if (!res.ok || !data.trip) {
        throw new Error(data.error || 'Could not create trip')
      }
      await addPinToTrip(data.trip.id)
      toast.success(`Created ${title} and added ${place?.place_name}`)
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create trip')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to a trip</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{place?.place_name}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : unavailable ? (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-3">
            Trips are launching soon (database migrations 26/27 pending).
          </p>
        ) : loadError ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load your trips.</p>
            <Button variant="secondary" size="sm" onClick={fetchTrips}>
              Try again
            </Button>
          </div>
        ) : (
          <>
            {/* Existing trips */}
            {trips.length > 0 ? (
              <div className="space-y-1.5">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    disabled={addingTripId !== null}
                    onClick={() => handlePick(trip)}
                    className="w-full flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left hover:bg-muted/60 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <span className="text-xl leading-none shrink-0">{trip.cover_emoji || '🗺️'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground truncate">{trip.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {trip.pin_count} {trip.pin_count === 1 ? 'stop' : 'stops'}
                      </span>
                    </span>
                    {addingTripId === trip.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                    ) : (
                      <Plus className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Luggage className="h-4 w-4" />
                No trips yet — create your first one below.
              </p>
            )}

            {/* Create new trip */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">New trip</p>
              <div className="flex gap-2">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateAndAdd()
                    }
                  }}
                  placeholder="e.g. Japan 2026"
                  maxLength={120}
                />
                <Button
                  onClick={handleCreateAndAdd}
                  disabled={creating || !newTitle.trim()}
                  variant="coral"
                  className="gap-1.5 shrink-0"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Create
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
