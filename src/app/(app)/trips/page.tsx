'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Map as MapIcon, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import type { Trip } from '@/types/trips'

interface TripListItem extends Trip {
  pin_count: number
  my_role: 'owner' | 'editor' | 'viewer'
}

export default function TripsPage() {
  const { user } = useAuth()
  const [trips, setTrips] = useState<TripListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/trips')
      const data = await res.json()
      if (res.ok) setTrips(data.trips || [])
    } catch (error) {
      log.error('Failed to load trips list', { component: 'TripsPage', action: 'load' }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  const handleCreate = async () => {
    if (!title.trim()) return
    try {
      setCreating(true)
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setDialogOpen(false)
      setTitle('')
      setDescription('')
      setStartDate('')
      setEndDate('')
      await load()
      // Navigate into the new trip
      if (data.trip?.id) window.location.href = `/trips/${data.trip.id}`
    } catch (error) {
      log.error('Failed to create trip', { component: 'TripsPage', action: 'create' }, error as Error)
    } finally {
      setCreating(false)
    }
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-olive-950 dark:text-olive-50">Trip Planner</h1>
          <p className="text-sm text-olive-600 dark:text-olive-400 mt-1">
            Collaborate on trips — paste Google Maps links, each person pins in their own color.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-olive-700 hover:bg-olive-800 text-white rounded-xl">
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
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">End date</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-olive-700 hover:bg-olive-800 text-white"
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
          <Loader2 className="h-6 w-6 animate-spin text-olive-600" />
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-olive-100 dark:bg-olive-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapIcon className="h-7 w-7 text-olive-600" />
          </div>
          <h3 className="text-lg font-semibold text-olive-950 dark:text-olive-50 mb-2">
            No trips yet
          </h3>
          <p className="text-sm text-olive-600 dark:text-olive-400 mb-6 max-w-md mx-auto">
            Create a trip, invite friends, and paste Google Maps links to see everyone&apos;s picks on one map.
          </p>
          <Button
            className="bg-olive-700 hover:bg-olive-800 text-white rounded-xl"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create your first trip
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="p-5 h-full hover:shadow-md transition-shadow cursor-pointer border-olive-100 dark:border-white/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{trip.cover_emoji || '🗺️'}</div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-olive-500">
                    {trip.my_role}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-olive-950 dark:text-olive-50 line-clamp-1">
                  {trip.title}
                </h3>
                {trip.description && (
                  <p className="text-sm text-olive-600 dark:text-olive-400 line-clamp-2 mt-1">
                    {trip.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-4 text-xs text-olive-600 dark:text-olive-400">
                  <span className="flex items-center gap-1">
                    <MapIcon className="h-3.5 w-3.5" />
                    {trip.pin_count} pins
                  </span>
                  {trip.start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(trip.start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
