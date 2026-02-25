'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Records an album view (deduplicated per user per day server-side).
 * Fires once per mount, debounced by 2 seconds to avoid counting quick navigations.
 */
export function useRecordAlbumView(albumId: string | undefined, userId: string | undefined) {
  const recorded = useRef(false)

  useEffect(() => {
    if (!albumId || !userId || recorded.current) return

    const timer = setTimeout(async () => {
      if (recorded.current) return
      recorded.current = true

      try {
        const supabase = createClient()
        await supabase.rpc('record_album_view', {
          p_album_id: albumId,
          p_viewer_id: userId,
        })
      } catch {
        // Silent fail - view tracking is non-critical
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [albumId, userId])
}
