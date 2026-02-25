'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Share2, Download, Check, Loader2, Globe } from 'lucide-react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface TravelMapCardProps {
  userId: string
  displayName: string
  countryCodes: string[]
  cityCount: number
  albumCount: number
}

function countryCodeToFlag(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65)
  return String.fromCodePoint(...codePoints)
}

export function TravelMapCard({
  userId,
  displayName,
  countryCodes,
  cityCount,
  albumCount,
}: TravelMapCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [shared, setShared] = useState(false)

  const cardUrl = `/api/travel-card?userId=${userId}`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(cardUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${displayName.replace(/\s+/g, '-').toLowerCase()}-travel-map.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Travel map downloaded!')
    } catch {
      toast.error('Failed to download travel map')
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    try {
      const appUrl = window.location.origin
      const shareUrl = `${appUrl}/profile/${userId}`

      if (navigator.share) {
        // Try sharing with the generated image
        try {
          const response = await fetch(cardUrl)
          const blob = await response.blob()
          const file = new File([blob], 'travel-map.png', { type: 'image/png' })
          await navigator.share({
            title: `${displayName}'s Travel Map`,
            text: `I've visited ${countryCodes.length} countries and ${cityCount} cities! Check out my adventures on Adventure Log.`,
            url: shareUrl,
            files: [file],
          })
        } catch {
          // Fallback to sharing without image
          await navigator.share({
            title: `${displayName}'s Travel Map`,
            text: `I've visited ${countryCodes.length} countries and ${cityCount} cities! Check out my adventures on Adventure Log.`,
            url: shareUrl,
          })
        }
      } else {
        await navigator.clipboard.writeText(
          `I've visited ${countryCodes.length} countries and ${cityCount} cities! Check out my adventures: ${shareUrl}`
        )
        setShared(true)
        toast.success('Copied to clipboard!')
        setTimeout(() => setShared(false), 2000)
      }
    } catch {
      // User cancelled share
    }
  }

  const flags = countryCodes.slice(0, 12).map(countryCodeToFlag)

  return (
    <GlassCard variant="frost" hover="lift" className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-teal-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Share Your Travel Map</h3>
        </div>

        {/* Mini preview */}
        <div className="relative rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-slate-800 via-slate-900 to-teal-900 p-4">
          {/* Stats */}
          <div className="flex gap-4 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-400">{countryCodes.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{cityCount}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Cities</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{albumCount}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Trips</div>
            </div>
          </div>

          {/* Flags */}
          {flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {flags.map((flag, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                  className="text-lg bg-white/10 rounded-md w-8 h-8 flex items-center justify-center"
                >
                  {flag}
                </motion.span>
              ))}
              {countryCodes.length > 12 && (
                <span className="text-xs text-slate-400 flex items-center px-2">
                  +{countryCodes.length - 12} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleShare}
            size="sm"
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xs rounded-lg"
          >
            {shared ? (
              <Check className="h-3.5 w-3.5 mr-1" />
            ) : (
              <Share2 className="h-3.5 w-3.5 mr-1" />
            )}
            {shared ? 'Copied!' : 'Share'}
          </Button>
          <Button
            onClick={handleDownload}
            size="sm"
            variant="outline"
            disabled={downloading}
            className="text-xs rounded-lg"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1" />
            )}
            Download
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
