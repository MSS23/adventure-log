'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, MapPin, Sparkles, X } from 'lucide-react'
import Link from 'next/link'

interface FirstAlbumPromptProps {
  hasAlbums: boolean
  onDismiss?: () => void
}

export function FirstAlbumPrompt({ hasAlbums, onDismiss }: FirstAlbumPromptProps) {
  const [dismissed, setDismissed] = useState(false)

  if (hasAlbums || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">Create Your First Adventure! 🎉</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Welcome to Adventure Log! Start documenting your travels by creating your first album.
              Add photos, locations, and watch your journey come alive on the interactive globe.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Features Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="flex items-start gap-2 text-sm">
            <Camera className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Upload Photos</p>
              <p className="text-gray-600 text-xs">Add memories from your adventures</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Mark Locations</p>
              <p className="text-gray-600 text-xs">Pin where your journey took place</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900">Share Stories</p>
              <p className="text-gray-600 text-xs">Let friends follow your travels</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link href="/albums/new">
          <Button className="w-full bg-green-600 hover:bg-green-700">
            <Camera className="h-4 w-4 mr-2" />
            Create First Album
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
