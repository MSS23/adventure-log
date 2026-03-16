'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Video, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import type { EnhancedGlobeRef } from './EnhancedGlobe'

interface GlobeFlyoverExportProps {
  globeRef: React.RefObject<EnhancedGlobeRef | null>
  locations: Array<{ lat: number; lng: number; name: string }>
  onClose: () => void
  isOpen: boolean
}

type DurationOption = 10 | 20 | 30
type QualityOption = '720p' | '1080p'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function GlobeFlyoverExport({ globeRef, locations, onClose, isOpen }: GlobeFlyoverExportProps) {
  const [duration, setDuration] = useState<DurationOption>(20)
  const [quality, setQuality] = useState<QualityOption>('1080p')
  const [recording, setRecording] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const cancelledRef = useRef(false)

  const startRecording = useCallback(async () => {
    const globe = globeRef.current
    if (!globe) {
      setError('Globe is not ready. Please wait and try again.')
      return
    }

    const canvas = globe.getCanvas()
    if (!canvas) {
      setError('Could not access globe canvas. Please try again.')
      return
    }

    if (locations.length === 0) {
      setError('No locations available for flyover.')
      return
    }

    // Check MediaRecorder support
    if (typeof MediaRecorder === 'undefined') {
      setError('Your browser does not support video recording. Please use Chrome or Firefox.')
      return
    }

    // Determine best supported mime type
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ]
    const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t))
    if (!mimeType) {
      setError('Your browser does not support WebM video recording.')
      return
    }

    setError(null)
    setDownloadUrl(null)
    setRecording(true)
    setProgress(0)
    cancelledRef.current = false

    try {
      const stream = canvas.captureStream(30)
      const bitRate = quality === '1080p' ? 8_000_000 : 4_000_000
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitRate,
      })
      recorderRef.current = recorder

      const chunks: BlobPart[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        if (cancelledRef.current) {
          setRecording(false)
          setProgress(0)
          return
        }
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setDownloadUrl(url)
        setRecording(false)
        setProgress(100)
        log.info('Flyover recording complete', {
          component: 'GlobeFlyoverExport',
          action: 'recording-complete',
          duration,
          quality,
          locationCount: locations.length,
          blobSize: blob.size,
        })
      }

      recorder.start(100) // collect data every 100ms

      // Animate the flyover
      await animateFlyover(globe, locations, duration * 1000)

      if (!cancelledRef.current && recorder.state === 'recording') {
        recorder.stop()
      }
    } catch (err) {
      log.error('Flyover recording failed', { component: 'GlobeFlyoverExport', action: 'recording-error' }, err as Error)
      setError('Recording failed. Please try again.')
      setRecording(false)
      setProgress(0)
    }
  }, [globeRef, locations, duration, quality])

  async function animateFlyover(
    globe: EnhancedGlobeRef,
    locs: Array<{ lat: number; lng: number; name: string }>,
    totalDurationMs: number
  ) {
    const segmentMs = totalDurationMs / Math.max(locs.length, 1)

    // Start zoomed out
    await globe.flyTo(20, 0, 2.5, 0)
    await sleep(400)

    if (cancelledRef.current) return

    for (let i = 0; i < locs.length; i++) {
      if (cancelledRef.current) return

      const loc = locs[i]
      const isFirst = i === 0

      // Fly to location
      const transitionMs = isFirst ? segmentMs * 0.6 : segmentMs * 0.75
      await globe.flyTo(loc.lat, loc.lng, 1.5, transitionMs)

      if (cancelledRef.current) return

      // Pause briefly at each location
      await sleep(segmentMs * 0.25)

      setProgress(Math.round(((i + 1) / locs.length) * 90))
    }

    if (cancelledRef.current) return

    // Zoom back out at the end
    setProgress(95)
    await globe.flyTo(20, 0, 2.5, 2000)
    await sleep(2000)
  }

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    setRecording(false)
    setProgress(0)
  }, [])

  const handleDownload = useCallback(() => {
    if (!downloadUrl) return
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `adventure-log-flyover-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [downloadUrl])

  const handleClose = useCallback(() => {
    if (recording) {
      cancelRecording()
    }
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl)
    }
    onClose()
  }, [recording, downloadUrl, cancelRecording, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!recording ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-[calc(100%-2rem)] sm:w-full max-w-md sm:mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-stone-200 dark:border-neutral-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-olive-600 dark:text-olive-400" />
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Export Flyover Video
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors"
            disabled={recording}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Info */}
          <div className="text-sm text-stone-600 dark:text-stone-400">
            Record a cinematic flyover of your{' '}
            <span className="font-medium text-stone-800 dark:text-stone-200">
              {locations.length} travel location{locations.length !== 1 ? 's' : ''}
            </span>{' '}
            on the globe and download it as a video.
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              {([10, 20, 30] as DurationOption[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  disabled={recording}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                    duration === d
                      ? 'bg-olive-500 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-neutral-700'
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Quality
            </label>
            <div className="flex gap-2">
              {(['720p', '1080p'] as QualityOption[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  disabled={recording}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                    quality === q
                      ? 'bg-olive-500 text-white shadow-sm'
                      : 'bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-neutral-700'
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {(recording || progress === 100) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600 dark:text-stone-400">
                  {recording ? (
                    <span className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                      Recording...
                    </span>
                  ) : (
                    'Complete'
                  )}
                </span>
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {progress}%
                </span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    progress === 100
                      ? 'bg-green-500'
                      : 'bg-olive-500'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-200 dark:border-neutral-700 flex items-center gap-3">
          {!recording && progress !== 100 && (
            <>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={startRecording}
                disabled={locations.length === 0}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-olive-500 hover:bg-olive-600 text-white shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Video className="h-4 w-4" />
                Start Recording
              </button>
            </>
          )}

          {recording && (
            <button
              onClick={cancelRecording}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white shadow-sm transition-colors"
            >
              Cancel Recording
            </button>
          )}

          {!recording && progress === 100 && downloadUrl && (
            <>
              <button
                onClick={() => {
                  setProgress(0)
                  setDownloadUrl(null)
                }}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-stone-100 dark:bg-neutral-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Record Again
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-olive-500 hover:bg-olive-600 text-white shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Video
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
