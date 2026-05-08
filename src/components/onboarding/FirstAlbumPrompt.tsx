'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Globe, ArrowRight, X } from 'lucide-react'
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
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111111] border border-stone-200/50 dark:border-white/[0.06]">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="px-6 sm:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-olive-600 dark:text-olive-400 mb-2">
            Get started
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Your travel globe is waiting
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1.5 max-w-lg">
            Every trip you add lights up a new location on your personal 3D globe.
            Join 2,000+ travelers already mapping their adventures.
          </p>
        </div>

        {/* 3-Step Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            {
              step: 1,
              icon: Upload,
              title: 'Upload photos',
              desc: 'Drop your travel photos. GPS data is extracted automatically.',
            },
            {
              step: 2,
              icon: Camera,
              title: 'Albums appear',
              desc: 'Photos become albums grouped by trip, location, and date.',
            },
            {
              step: 3,
              icon: Globe,
              title: 'Your globe lights up',
              desc: 'Each album pins a spot on your interactive 3D globe.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative flex flex-col items-center text-center p-4 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-100 dark:border-white/[0.04]"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-olive-100 dark:bg-olive-900/30 text-olive-700 dark:text-olive-300 text-sm font-bold mb-3">
                {item.step}
              </div>
              <item.icon className="h-5 w-5 text-olive-500 dark:text-olive-400 mb-2" strokeWidth={1.7} />
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">{item.title}</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Globe Preview Description */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-olive-50 to-stone-50 dark:from-olive-950/20 dark:to-stone-900/20 border border-olive-100 dark:border-olive-900/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-olive-100 dark:bg-olive-900/40 flex items-center justify-center">
              <Globe className="h-5 w-5 text-olive-600 dark:text-olive-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                Imagine a spinning 3D globe with glowing pins on every city you have visited
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Flight arcs connecting your trips, a timeline scrubber to replay your travel history, and flyover videos you can share on social media. That is what your globe will look like.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/albums/import" className="flex-1">
            <Button className="w-full gap-2 bg-olive-600 hover:bg-olive-500 text-white h-11 text-sm font-semibold rounded-xl">
              <Upload className="h-4 w-4" />
              Import Photos
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </Link>
          <Link href="/albums/new" className="flex-1">
            <Button variant="outline" className="w-full gap-2 h-11 text-sm font-semibold rounded-xl border-stone-300 dark:border-stone-700">
              <Camera className="h-4 w-4" />
              Create Album Manually
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
