'use client'

/**
 * Orchestrates the Wrapped flyover video export:
 *
 *   Export button → page remounts the animated globe (fresh flight, renderer
 *   created with preserveDrawingBuffer) → begin(canvas) spins up the 9:16
 *   watermark compositor + MediaRecorder → the flight plays while the
 *   compositor records → onAnimationComplete (+ finale hold) → finish()
 *   stops the recorder and shares/downloads the file.
 *
 * The recorder util is dynamically imported so none of it ships in the
 * normal Wrapped bundle path until the stats screen mounts.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { log } from '@/lib/utils/logger'
import { getWebOrigin } from '@/lib/utils/native-routes'
import { trackGrowthEvent } from '@/lib/utils/growth-events'
import type {
  CanvasRecording,
  WatermarkCompositor,
} from '@/lib/utils/globe-recorder'

type RecorderModule = typeof import('@/lib/utils/globe-recorder')

export type VideoExportStatus = 'idle' | 'recording' | 'saving'

interface ActiveSession {
  recording: CanvasRecording
  compositor: WatermarkCompositor
  startedAt: number
}

const FALLBACK_ORIGIN = 'https://adventure-log-azure.vercel.app'

export function useWrappedVideoExport({ year }: { year: number | 'all' }) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<VideoExportStatus>('idle')
  const moduleRef = useRef<RecorderModule | null>(null)
  const sessionRef = useRef<ActiveSession | null>(null)

  // Feature-detect lazily: the recorder chunk loads after mount, only on
  // this page, and `supported` stays false (button hidden) on Safari/old
  // WebViews without captureStream or MediaRecorder.
  useEffect(() => {
    let cancelled = false
    import('@/lib/utils/globe-recorder')
      .then((mod) => {
        moduleRef.current = mod
        if (!cancelled) setSupported(mod.canRecordVideo())
      })
      .catch(() => {
        // Chunk failed to load (offline?) — leave the button hidden.
      })
    return () => {
      cancelled = true
    }
  }, [])

  /** Abort the active recording and throw the footage away. */
  const cancel = useCallback(() => {
    const session = sessionRef.current
    sessionRef.current = null
    if (session) {
      session.compositor.stop()
      session.recording.stop().catch(() => {
        // Discarding — a stop failure has nothing to surface.
      })
    }
    setStatus('idle')
  }, [])

  // Stop cleanly if the user navigates away mid-recording.
  useEffect(() => cancel, [cancel])

  /**
   * Start recording the given globe canvas. Returns false when recording
   * could not start (caller should fall back to a normal replay).
   */
  const begin = useCallback(async (canvas: HTMLCanvasElement): Promise<boolean> => {
    if (sessionRef.current) return false
    try {
      const mod = moduleRef.current ?? (await import('@/lib/utils/globe-recorder'))
      moduleRef.current = mod
      if (!mod.canRecordVideo()) return false

      const origin = getWebOrigin() || FALLBACK_ORIGIN
      let host = origin
      try {
        host = new URL(origin).host
      } catch {
        // Keep the raw origin string if it isn't URL-parseable.
      }
      const label = year === 'all' ? 'All-Time' : String(year)
      const compositor = mod.createWatermarkCompositor(canvas, {
        title: 'Roamkeep',
        subtitle: `${host} · ${label} Wrapped`,
      })
      if (!compositor) return false

      const recording = mod.startRecording(compositor.canvas)
      if (!recording) {
        compositor.stop()
        return false
      }

      sessionRef.current = { recording, compositor, startedAt: Date.now() }
      setStatus('recording')
      return true
    } catch (err) {
      log.error(
        'Flyover recording failed to start',
        { component: 'useWrappedVideoExport', action: 'begin' },
        err as Error
      )
      return false
    }
  }, [year])

  /** Stop recording, then share the file (or download it as a fallback). */
  const finish = useCallback(async (): Promise<void> => {
    const session = sessionRef.current
    if (!session) return
    sessionRef.current = null
    setStatus('saving')
    try {
      session.compositor.stop()
      const blob = await session.recording.stop()
      const durationMs = Date.now() - session.startedAt
      const mod = moduleRef.current
      const ext = mod
        ? mod.extensionForMimeType(session.recording.mimeType)
        : session.recording.mimeType.startsWith('video/mp4')
          ? 'mp4'
          : 'webm'
      const yearLabel = year === 'all' ? 'all-time' : String(year)
      const file = new File([blob], `travel-wrapped-${yearLabel}.${ext}`, {
        type: blob.type || session.recording.mimeType.split(';')[0],
      })

      let handled = false
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'My Travel Wrapped',
          })
          handled = true
        } catch (err) {
          // User dismissed the share sheet — that's a completed flow, don't
          // force a download on top of it. Real failures fall through.
          if ((err as Error)?.name === 'AbortError') handled = true
        }
      }
      if (!handled) {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
        toast.success('Video saved!')
      }

      trackGrowthEvent('video_export', {
        meta: {
          year: yearLabel,
          mimeType: session.recording.mimeType,
          ms: durationMs,
        },
      })
    } catch (err) {
      log.error(
        'Flyover video export failed',
        { component: 'useWrappedVideoExport', action: 'finish' },
        err as Error
      )
      toast.error('Could not export your video. Please try again.')
    } finally {
      setStatus('idle')
    }
  }, [year])

  return { supported, status, begin, finish, cancel }
}
