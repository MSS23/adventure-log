'use client'

import { motion } from 'framer-motion'
import { Globe, MapPin, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
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
    <GlassCard
      variant="featured"
      hover="lift"
      glow="teal"
      padding="none"
      className="overflow-hidden"
    >
      {/* Animated globe visual */}
      <div className="relative h-36 bg-gradient-to-br from-stone-800 via-slate-900 to-stone-800 overflow-hidden">
        {/* Stars background */}
        <div className="absolute inset-0 opacity-40">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Animated globe sphere */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          >
            {/* Globe */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-olive-400 via-olive-500 to-olive-600 shadow-2xl shadow-olive-500/40 relative overflow-hidden">
              {/* Globe lines */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50 -translate-y-1/2" />
                <div className="absolute top-1/4 left-0 right-0 h-px bg-white/30 -translate-y-1/2" />
                <div className="absolute top-3/4 left-0 right-0 h-px bg-white/30 -translate-y-1/2" />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/50 -translate-x-1/2" />
                <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/30" />
                <div className="absolute top-0 bottom-0 left-3/4 w-px bg-white/30" />
              </div>
              {/* Highlight */}
              <div className="absolute top-2 left-4 w-6 h-4 bg-white/20 rounded-full blur-sm" />
            </div>
          </motion.div>

          {/* Orbit ring */}
          <motion.div
            className="absolute w-32 h-32 border border-olive-400/30 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            {/* Orbit dot */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-olive-400 rounded-full shadow-lg shadow-olive-400/50" />
          </motion.div>
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
          <Sparkles className="h-4 w-4 text-olive-500" />
          <h3 className="font-semibold text-stone-900">Your Travel Globe</h3>
        </div>
        <p className="text-sm text-stone-600 mb-4">
          See all your adventures visualized on an interactive 3D globe
        </p>
        <Button
          onClick={() => router.push('/globe')}
          className="w-full bg-gradient-to-r from-olive-500 to-olive-500 hover:from-olive-600 hover:to-olive-600 text-white font-medium rounded-xl shadow-lg shadow-olive-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-olive-500/30"
        >
          <Globe className="h-4 w-4 mr-2" />
          Explore Globe
        </Button>
      </div>
    </GlassCard>
  )
}
