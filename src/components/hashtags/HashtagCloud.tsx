'use client'

/**
 * HashtagCloud Component
 *
 * Display hashtags as clickable pills with trending indicators
 */

import Link from 'next/link'
import { Hash, TrendingUp } from 'lucide-react'
import type { Hashtag } from '@/types/database'

interface HashtagCloudProps {
  hashtags: Hashtag[]
  showTrending?: boolean
  showUsageCount?: boolean
  variant?: 'default' | 'compact' | 'large'
  className?: string
}

export function HashtagCloud({
  hashtags,
  showTrending = false,
  showUsageCount = false,
  variant = 'default',
  className = ''
}: HashtagCloudProps) {
  if (hashtags.length === 0) {
    return null
  }

  const getHashtagSize = (usageCount: number, maxCount: number): string => {
    const ratio = usageCount / maxCount
    if (ratio > 0.7) return 'text-lg'
    if (ratio > 0.4) return 'text-base'
    return 'text-sm'
  }

  const maxUsageCount = Math.max(...hashtags.map(h => h.usage_count))

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return 'px-2 py-1 text-xs'
      case 'large':
        return 'px-4 py-2.5 text-base'
      default:
        return 'px-3 py-1.5 text-sm'
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {hashtags.map((hashtag) => {
        const isTrending = showTrending && hashtag.trending_rank !== null
        const sizeClass = getHashtagSize(hashtag.usage_count, maxUsageCount)

        return (
          <Link
            key={hashtag.id}
            href={`/explore/tags/${encodeURIComponent(hashtag.tag)}`}
            className={`
              inline-flex items-center gap-1.5
              bg-white border border-gray-200 rounded-full
              hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700
              transition-all duration-200
              ${getVariantClasses()}
              ${isTrending ? 'ring-2 ring-teal-100' : ''}
            `}
          >
            <Hash className="w-3.5 h-3.5" />
            <span className={`font-medium ${sizeClass}`}>
              {hashtag.tag}
            </span>
            {isTrending && hashtag.trending_rank && (
              <span className="flex items-center gap-0.5 text-teal-600">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold">
                  #{hashtag.trending_rank}
                </span>
              </span>
            )}
            {showUsageCount && (
              <span className="text-xs text-gray-500 font-normal">
                {hashtag.usage_count.toLocaleString()}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * TrendingHashtagsCard Component
 *
 * Card displaying trending hashtags
 */
interface TrendingHashtagsCardProps {
  limit?: number
  className?: string
}

export function TrendingHashtagsCard({
  limit = 10,
  className = ''
}: TrendingHashtagsCardProps) {
  // This would typically fetch from useHashtags hook
  // For now it's a placeholder that expects to be used with data from parent

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-teal-600" />
        <h3 className="text-lg font-bold text-gray-900">Trending Tags</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Popular hashtags this week
      </p>

      {/* This should be replaced with actual data from parent */}
      <div className="text-sm text-gray-500 text-center py-4">
        No trending hashtags available
      </div>
    </div>
  )
}
