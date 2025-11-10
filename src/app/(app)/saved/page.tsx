'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { Loader2, Bookmark, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SavedPage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="h-7 w-7 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Saved Albums</h1>
          </div>
          <p className="text-sm text-gray-600">
            Albums you've saved for later
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <Bookmark className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-base mb-2">No saved albums yet</p>
          <p className="text-sm text-gray-400 mb-6">
            Discover albums from other travelers and save them here
          </p>
          <Link href="/explore">
            <Button className="bg-teal-500 hover:bg-teal-600 text-white">
              Explore Albums
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
