'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Globe2,
  Heart,
  MessageCircle,
  Compass,
  UserPlus,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { GlassCard } from '@/components/ui/glass-card'
import type { CompanionMatch } from '@/lib/hooks/useCompanions'

interface CompanionCardProps {
  match: CompanionMatch
  onConnect: (userId: string, message?: string) => void
  isConnecting?: boolean
  isConnected?: boolean
  index?: number
}

const styleColors: Record<string, string> = {
  adventure: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  relaxation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  culture: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  food: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  nature: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  luxury: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  backpacking: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  photography: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  family: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  solo: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 60) return 'text-amber-600 dark:text-amber-400'
  if (score >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-stone-500 dark:text-stone-400'
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return 'stroke-emerald-500'
  if (score >= 60) return 'stroke-amber-500'
  if (score >= 40) return 'stroke-amber-500'
  return 'stroke-stone-400'
}

export default function CompanionCard({
  match,
  onConnect,
  isConnecting = false,
  isConnected = false,
  index = 0,
}: CompanionCardProps) {
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const user = match.user

  const displayName = user?.display_name || user?.name || user?.username || 'Traveler'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const circumference = 2 * Math.PI * 28
  const strokeDashoffset = circumference - (match.compatibility_score / 100) * circumference

  return (
    <GlassCard
      animate
      staggerIndex={index}
      hover="lift"
      glow="teal"
      className="dark:bg-stone-800/80 dark:border-stone-700/50"
    >
      <div className="flex items-start gap-4">
        {/* Avatar with compatibility ring */}
        <div className="relative flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-stone-200 dark:text-stone-700"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className={getScoreRingColor(match.compatibility_score)}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Avatar className="h-11 w-11">
              <AvatarImage src={user?.avatar_url || undefined} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900 dark:text-white truncate">
              {displayName}
            </h3>
            <span
              className={cn(
                'text-lg font-bold tabular-nums',
                getScoreColor(match.compatibility_score)
              )}
            >
              {match.compatibility_score}%
            </span>
          </div>

          {user?.location && (
            <p className="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {user.location}
            </p>
          )}

          {/* Travel Styles */}
          {match.travel_styles && match.travel_styles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {match.travel_styles.slice(0, 4).map((style) => (
                <span
                  key={style}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    styleColors[style] || 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
                  )}
                >
                  {style}
                </span>
              ))}
              {match.travel_styles.length > 4 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400">
                  +{match.travel_styles.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Shared stats */}
          <div className="flex items-center gap-4 mt-3 text-xs text-stone-500 dark:text-stone-400">
            {match.shared_interests.length > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-pink-400" />
                {match.shared_interests.length} shared interests
              </span>
            )}
            {match.shared_destinations.length > 0 && (
              <span className="flex items-center gap-1">
                <Globe2 className="h-3 w-3 text-amber-400" />
                {match.shared_destinations.length} shared destinations
              </span>
            )}
          </div>

          {/* Shared destinations preview */}
          {match.shared_destinations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {match.shared_destinations.slice(0, 3).map((dest) => (
                <span
                  key={dest}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs"
                >
                  <Compass className="h-2.5 w-2.5" />
                  {dest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {match.bio_travel && (
        <p className="text-sm text-stone-600 dark:text-stone-300 mt-4 line-clamp-2">
          {match.bio_travel}
        </p>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {isConnected ? (
          <Button
            disabled
            className="flex-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default"
            size="sm"
          >
            <Check className="h-4 w-4 mr-1" />
            Request Sent
          </Button>
        ) : showMessage ? (
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Add a message (optional)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <Button
              size="sm"
              onClick={() => {
                onConnect(match.user_id, message || undefined)
                setShowMessage(false)
              }}
              disabled={isConnecting}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Send'
              )}
            </Button>
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMessage(true)}
              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button
              size="sm"
              onClick={() => onConnect(match.user_id)}
              disabled={isConnecting}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Connect
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </GlassCard>
  )
}
