'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Map as MapIcon, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'
import { parseLocalDate } from '@/lib/utils/travel-date'
import type { Trip } from '@/types/trips'

interface TripListItem extends Trip {
  pin_count: number
  my_role: 'owner' | 'editor' | 'viewer'
}

// Sentinel error thrown by the query when the trips/trip_pins tables haven't
// been provisioned yet (503 + NOT_PROVISIONED). The component checks for this
// to distinguish the friendly "launching soon" state from a real, retryable
// failure. A transient 500 must NOT masquerade as "coming soon".
class TripsNotProvisionedError extends Error {
  readonly notProvisioned = true
  constructor() {
    super('Trip planner tables are not provisioned')
    this.name = 'TripsNotProvisionedError'
  }
}

export default function TripsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  // Today in the user's local timezone as YYYY-MM-DD — used to block past dates.
  const todayStr = new Date().toLocaleDateString('en-CA')

  const {
    data: trips = [],
    isPending,
    isError,
    error: queryError,
    refetch,
  } = useQuery<TripListItem[]>({
    queryKey: ['trips', user?.id],
    enabled: !!user,
    // The old single-shot fetch surfaced its error/unavailable state
    // immediately — don't let the global retry:2 delay "launching soon" or the
    // error fallback.
    retry: false,
    queryFn: async () => {
      const res = await apiFetch('/api/trips')
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        return (data.trips || []) as TripListItem[]
      }
      if (res.status === 503 && data.code === 'NOT_PROVISIONED') {
        // The trips/trip_pins tables haven't been applied to this Supabase
        // project yet. Surface as a sentinel so the component can show a
        // friendly "launching soon" state rather than a retryable error.
        throw new TripsNotProvisionedError()
      }
      // Any other failure is a real, recoverable error — surface it with a
      // retry rather than a fake empty/coming-soon state.
      const err = new Error(data.error || 'Failed to load trips')
      log.error('Failed to load trips list', { component: 'TripsPage', action: 'load' }, err)
      throw err
    },
  })

  // Loading only matters once auth is resolved; while waiting for the user the
  // page renders its own spinner below.
  const loading = !!user && isPending
  const unavailable = isError && queryError instanceof TripsNotProvisionedError
  const loadError = isError && !unavailable

  const load = () => refetch()

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreateError(null)

    // Dates must be today or later, and the range must make sense.
    if (startDate && startDate < todayStr) {
      setCreateError('Start date can’t be in the past.')
      return
    }
    if (endDate && endDate < todayStr) {
      setCreateError('End date can’t be in the past.')
      return
    }
    if (startDate && endDate && endDate < startDate) {
      setCreateError('End date must be on or after the start date.')
      return
    }

    try {
      setCreating(true)
      const res = await apiFetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Surface a useful, specific message instead of silent failure
        if (res.status === 401) {
          setCreateError('You need to log in again to create a trip.')
        } else if (res.status === 503 && data.code === 'NOT_PROVISIONED') {
          // Same migration-missing case as in load(); also dev-facing
          // CLI guidance must NEVER reach end users. Refetch so the list query
          // re-throws the sentinel and the page flips to "launching soon".
          setDialogOpen(false)
          await refetch()
          if (process.env.NODE_ENV === 'development') {
            // Loud guidance for the developer on localhost
            log.warn(
              "Trip planner DB tables missing. Run `npm run migrate:trips` or apply supabase/migrations/26_trip_planner.sql + 27_trip_planner_phase2.sql",
              { component: 'TripsPage', action: 'create-missing-tables' }
            )
          }
        } else {
          setCreateError(data.error || `We couldn’t create that trip. Please try again.`)
        }
        return
      }
      setDialogOpen(false)
      setTitle('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      await queryClient.invalidateQueries({ queryKey: ['trips', user?.id] })
      if (data.trip?.id) window.location.href = `/trips/${data.trip.id}`
    } catch (error) {
      log.error('Failed to create trip', { component: 'TripsPage', action: 'create' }, error as Error)
      setCreateError('Network error — please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 md:pt-8 pb-24 md:pb-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header className="min-w-0 space-y-1">
          <p className="al-eyebrow">Plan · Together</p>
          <h1 className="al-display text-3xl md:text-4xl">Trip Planner</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Collaborate on trips — paste Google Maps links, each person pins in their own color.
          </p>
        </header>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="coral" size="pill" className="shrink-0 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Trip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tokyo 2026"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Spring cherry blossom trip with friends"
                  maxLength={500}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start date</label>
                  <Input type="date" min={todayStr} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">End date</label>
                  <Input type="date" min={startDate || todayStr} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
            {createError && (
              <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive">
                {createError}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <MapIcon className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Couldn&apos;t load your trips
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Something went wrong reaching the server. Your trips are safe — this is
            usually temporary.
          </p>
          <div className="mt-5">
            <Button onClick={() => load()}>
              Try again
            </Button>
          </div>
        </div>
      ) : unavailable ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <MapIcon className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Trip Planner is launching soon
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            We&apos;re putting the finishing touches on collaborative trip
            planning. In the meantime, you can still build albums and
            wishlists from your dashboard.
          </p>
          <div className="mt-5">
            <Link href="/feed">
              <Button>
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <MapIcon className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            No trips yet
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Create a trip, invite friends, and paste Google Maps links to see everyone&apos;s picks on one map.
          </p>
          <div className="mt-5">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first trip
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="group block h-full rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{trip.cover_emoji || '🗺️'}</div>
                <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {trip.my_role}
                </span>
              </div>
              <h3 className="font-heading text-base md:text-lg font-semibold text-foreground line-clamp-1 tracking-tight">
                {trip.title}
              </h3>
              {trip.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                  {trip.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapIcon className="h-3.5 w-3.5" />
                  {trip.pin_count} {trip.pin_count === 1 ? 'pin' : 'pins'}
                </span>
                {trip.start_date && (
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                    <Calendar className="h-3 w-3" />
                    {parseLocalDate(trip.start_date)?.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
