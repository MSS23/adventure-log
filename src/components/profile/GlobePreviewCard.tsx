'use client'

import { Globe, MapPin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface GlobePreviewCardProps {
  albumCount: number
  countryCount: number
}

export function GlobePreviewCard({
  albumCount,
  countryCount
}: GlobePreviewCardProps) {
  const router = useRouter()
  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#111111] overflow-hidden shadow-sm">
      {/* Globe visual */}
      <div className="relative h-36 bg-gradient-to-br from-stone-800 via-slate-900 to-stone-800 overflow-hidden">
        {/* Simple globe sphere */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-olive-400 via-olive-500 to-olive-600 shadow-2xl shadow-olive-500/40 relative overflow-hidden">
              {/* Globe grid lines */}
              <div className="absolute inset-0 opacity-25">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/60 -translate-y-1/2" />
                <div className="absolute top-1/4 left-0 right-0 h-px bg-white/40 -translate-y-1/2" />
                <div className="absolute top-3/4 left-0 right-0 h-px bg-white/40 -translate-y-1/2" />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/60 -translate-x-1/2" />
                <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/40" />
                <div className="absolute top-0 bottom-0 left-3/4 w-px bg-white/40" />
              </div>
              <div className="absolute top-2 left-4 w-6 h-4 bg-white/20 rounded-full blur-sm" />
            </div>
            {/* Subtle ring */}
            <div className="absolute inset-[-16px] border border-olive-400/20 rounded-full" />
          </div>
        </div>

        {/* Stats overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center gap-4 text-white text-sm">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-olive-400" />
              <span className="font-medium">{albumCount} adventures</span>
            </div>
            <div className="w-px h-4 bg-white/30" />
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-olive-400" />
              <span className="font-medium">{countryCount} countries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-olive-500 dark:text-olive-400" />
          <h3 className="font-semibold text-stone-900 dark:text-stone-100">Your Travel Globe</h3>
        </div>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
          See all your adventures on an interactive 3D globe
        </p>
        <Button
          onClick={() => router.push('/globe')}
          className="w-full bg-olive-600 hover:bg-olive-700 text-white font-medium rounded-xl"
        >
          <Globe className="h-4 w-4 mr-2" />
          Explore Globe
        </Button>
      </div>
    </div>
  )
}
