'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OptimizedAvatar } from '@/components/ui/optimized-avatar'
import { log } from '@/lib/utils/logger'
import Link from 'next/link'

interface Story {
  id: string
  user_id: string
  created_at: string
  user: {
    id: string
    username: string
    display_name: string
    avatar_url?: string
  }
}

function formatTimeAgo(timestamp: string) {
  const now = new Date()
  const then = new Date(timestamp)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return then.toLocaleDateString()
}

export function StoriesSection() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStories = async () => {
      try {
        // Fetch recent stories (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data, error } = await supabase
          .from('stories')
          .select(`
            id,
            user_id,
            created_at,
            users!stories_user_id_fkey(id, username, display_name, avatar_url)
          `)
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error

        const formattedStories = data?.map((story) => ({
          id: story.id,
          user_id: story.user_id,
          created_at: story.created_at,
          user: (story as any).users
        })) || []

        setStories(formattedStories)
      } catch (error) {
        log.error('Failed to fetch stories', { component: 'StoriesSection', action: 'fetch' }, error as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchStories()
  }, [supabase])

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h3 className="text-white font-semibold mb-4">Stories</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1">
                <div className="h-3 w-24 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-2 w-16 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (stories.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-6 border-t border-white/10">
      <h3 className="text-white font-semibold mb-4 text-sm">Stories</h3>
      <div className="space-y-1">
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/stories/${story.id}`}
            className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 p-[2px]">
                <OptimizedAvatar
                  src={story.user.avatar_url}
                  alt={story.user.display_name}
                  fallback={story.user.display_name[0]?.toUpperCase() || 'U'}
                  size="sm"
                  className="ring-2 ring-[#0D2424]"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate group-hover:text-teal-300 transition-colors">
                {story.user.username}
              </p>
              <p className="text-gray-400 text-xs truncate">
                {formatTimeAgo(story.created_at)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
