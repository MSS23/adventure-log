'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Calendar, Globe, Heart, Trash2, Eye, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Itinerary } from '@/types/database'

export default function ItinerariesPage() {
  const { user } = useAuth()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  createClient() // Initialize client for session

  useEffect(() => {
    fetchItineraries()
  }, [filter, user?.id])

  async function fetchItineraries() {
    if (!user?.id) return

    setLoading(true)
    try {
      const url = filter === 'all'
        ? `/api/itineraries`
        : `/api/itineraries?status=${filter}`

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setItineraries(data.itineraries || [])
      }
    } catch (error) {
      console.error('Error fetching itineraries:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFavorite(id: string, currentValue: boolean) {
    try {
      const response = await fetch(`/api/itineraries/${id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !currentValue })
      })

      if (response.ok) {
        setItineraries(prev => prev.map(itinerary =>
          itinerary.id === id
            ? { ...itinerary, is_favorite: !currentValue }
            : itinerary
        ))
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  async function deleteItinerary(id: string) {
    if (!confirm('Are you sure you want to delete this itinerary?')) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/itineraries/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setItineraries(prev => prev.filter(itinerary => itinerary.id !== id))
      }
    } catch (error) {
      console.error('Error deleting itinerary:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const filterCounts = {
    all: itineraries.length,
    draft: itineraries.filter(i => i.status === 'draft').length,
    published: itineraries.filter(i => i.status === 'published').length,
    archived: itineraries.filter(i => i.status === 'archived').length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Loading itineraries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Itineraries</h1>
              <p className="text-gray-600 mt-1">AI-generated travel plans saved for your adventures</p>
            </div>
            <Link href="/trip-planner">
              <Button
                variant="outline"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Plan New Trip
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-6">
            {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  filter === status
                    ? "bg-teal-50 text-teal-600"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-1.5 text-xs opacity-75">({filterCounts[status]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {itineraries.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <Sparkles className="h-16 w-16 text-teal-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No itineraries yet
            </h3>
            <p className="text-gray-600 mb-6">
              Use the AI Trip Planner to generate your first travel itinerary
            </p>
            <Link href="/trip-planner">
              <Button
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Plan Your First Trip
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map((itinerary) => (
              <div
                key={itinerary.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                      {itinerary.title}
                    </h3>
                    <button
                      onClick={() => toggleFavorite(itinerary.id, itinerary.is_favorite)}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Heart
                        className={cn(
                          "h-5 w-5",
                          itinerary.is_favorite && "fill-red-500 text-red-500"
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="h-4 w-4" />
                    <span>{itinerary.country}</span>
                    {itinerary.region && (
                      <>
                        <span>•</span>
                        <span>{itinerary.region}</span>
                      </>
                    )}
                  </div>

                  {(itinerary.date_start || itinerary.date_end) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {itinerary.date_start && new Date(itinerary.date_start).toLocaleDateString()}
                        {itinerary.date_end && ` - ${new Date(itinerary.date_end).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="p-5">
                  <div className="text-sm text-gray-600 line-clamp-4 mb-4">
                    {itinerary.description || itinerary.itinerary_content.substring(0, 150) + '...'}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                    {itinerary.travel_style && (
                      <span className="px-2 py-1 bg-gray-100 rounded">{itinerary.travel_style}</span>
                    )}
                    {itinerary.budget && (
                      <span className="px-2 py-1 bg-gray-100 rounded">{itinerary.budget}</span>
                    )}
                    <span className={cn(
                      "px-2 py-1 rounded",
                      itinerary.status === 'published' && "bg-green-100 text-green-700",
                      itinerary.status === 'draft' && "bg-yellow-100 text-yellow-700",
                      itinerary.status === 'archived' && "bg-gray-100 text-gray-700"
                    )}>
                      {itinerary.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/itineraries/${itinerary.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteItinerary(itinerary.id)}
                      disabled={deletingId === itinerary.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === itinerary.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  Created {new Date(itinerary.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
