'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LiveViewersProps {
  albumId: string
  userId?: string
}

export function LiveViewers({ albumId, userId }: LiveViewersProps) {
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    if (!albumId) return

    const supabase = createClient()
    const channel = supabase.channel(`album-viewers:${albumId}`, {
      config: { presence: { key: userId || `anon-${Math.random().toString(36).slice(2)}` } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.keys(state).length
        setViewerCount(count)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, joined_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [albumId, userId])

  // Don't show if only the current user is viewing (count <= 1)
  if (viewerCount <= 1) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200/50 rounded-full"
      >
        <motion.div
          className="w-2 h-2 bg-green-500 rounded-full"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <Eye className="h-3 w-3 text-green-600" />
        <span className="text-xs font-medium text-green-700">
          {viewerCount} viewing
        </span>
      </motion.div>
    </AnimatePresence>
  )
}
