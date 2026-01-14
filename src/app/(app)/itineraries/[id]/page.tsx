'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Loader2, ArrowLeft, Heart, Share2, Trash2, Calendar, Globe, DollarSign, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Itinerary } from '@/types/database'
import ReactMarkdown from 'react-markdown'

export default function ItineraryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchItinerary()
    }
  }, [params.id, user?.id])

  async function fetchItinerary() {
    try {
      const response = await fetch(`/api/itineraries/${params.id}`)
      const data = await response.json()

      if (response.ok) {
        setItinerary(data.itinerary)
      } else {
        console.error('Failed to fetch itinerary')
      }
    } catch (error) {
      console.error('Error fetching itinerary:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleFavorite() {
    if (!itinerary) return

    try {
      const response = await fetch(`/api/itineraries/${itinerary.id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !itinerary.is_favorite })
      })

      if (response.ok) {
        setItinerary({ ...itinerary, is_favorite: !itinerary.is_favorite })
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  async function deleteItinerary() {
    if (!itinerary) return
    if (!confirm('Are you sure you want to delete this itinerary? This action cannot be undone.')) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/itineraries/${itinerary.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/itineraries')
      }
    } catch (error) {
      console.error('Error deleting itinerary:', error)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">Loading itinerary...</p>
        </div>
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Itinerary not found</h2>
          <p className="text-gray-600 mb-6">The itinerary you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/itineraries">
            <Button variant="outline">Back to Itineraries</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/itineraries">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Itineraries
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={toggleFavorite}>
                <Heart
                  className={cn(
                    "h-4 w-4",
                    itinerary.is_favorite && "fill-red-500 text-red-500"
                  )}
                />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={deleteItinerary}
                disabled={deleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            {itinerary.ai_generated && (
              <div className="p-2 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg">
                <Sparkles className="h-5 w-5 text-teal-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{itinerary.title}</h1>
              {itinerary.description && (
                <p className="text-gray-600">{itinerary.description}</p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="h-4 w-4" />
              <span className="font-medium">{itinerary.country}</span>
              {itinerary.region && (
                <>
                  <span>•</span>
                  <span>{itinerary.region}</span>
                </>
              )}
            </div>

            {(itinerary.date_start || itinerary.date_end) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {itinerary.date_start && new Date(itinerary.date_start).toLocaleDateString()}
                  {itinerary.date_end && ` - ${new Date(itinerary.date_end).toLocaleDateString()}`}
                </span>
              </div>
            )}

            {itinerary.budget && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span className="capitalize">{itinerary.budget}</span>
              </div>
            )}

            {itinerary.travel_style && (
              <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium">
                {itinerary.travel_style}
              </span>
            )}

            <span className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              itinerary.status === 'published' && "bg-green-100 text-green-700",
              itinerary.status === 'draft' && "bg-yellow-100 text-yellow-700",
              itinerary.status === 'archived' && "bg-gray-100 text-gray-700"
            )}>
              {itinerary.status}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          {/* Itinerary Content */}
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 first:mt-0" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2" {...props} />,
                p: ({ node, ...props }) => <p className="text-gray-700 mb-4 leading-relaxed" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4 text-gray-700" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-700" {...props} />,
                li: ({ node, ...props }) => <li className="ml-4" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900" {...props} />,
                em: ({ node, ...props }) => <em className="italic" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-teal-500 pl-4 py-2 my-4 bg-teal-50 text-gray-700 italic" {...props} />
                ),
              }}
            >
              {itinerary.itinerary_content}
            </ReactMarkdown>
          </div>

          {/* Additional Details */}
          {itinerary.additional_details && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Details</h3>
              <p className="text-gray-700">{itinerary.additional_details}</p>
            </div>
          )}

          {/* Related Albums */}
          {itinerary.related_album_ids && itinerary.related_album_ids.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Related Albums</h3>
              <div className="flex gap-2">
                {itinerary.related_album_ids.map((albumId) => (
                  <Link key={albumId} href={`/albums/${albumId}`}>
                    <Button variant="outline" size="sm">View Album</Button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Created on {new Date(itinerary.created_at).toLocaleDateString()} • Last updated {new Date(itinerary.updated_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}
