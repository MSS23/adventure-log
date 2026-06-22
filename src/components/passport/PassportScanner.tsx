'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { decodeQrFromImageData, extractPassportConnectPath } from '@/lib/utils/qr-decode'
import { log } from '@/lib/utils/logger'

/** Max dimension (px) we downscale frames to before QR decoding, for performance. */
const MAX_FRAME_DIMENSION = 640
/** Scan cadence in ms. */
const SCAN_INTERVAL_MS = 250
/** How long the "not a passport" hint stays visible / is debounced. */
const HINT_DURATION_MS = 2200

type ScannerStatus = 'initializing' | 'scanning' | 'denied'

export function PassportScanner({ onClose }: { onClose: () => void }) {
  const router = useRouter()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  // Lifecycle refs — never trigger re-renders, safe to read in async callbacks.
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const scanningRef = useRef(false) // guards against overlapping async decodes
  const navigatedRef = useRef(false) // ensures we only navigate once
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [status, setStatus] = useState<ScannerStatus>('initializing')
  const [hint, setHint] = useState<string | null>(null)

  /** Stop every track and tear down the scan loop. Idempotent. */
  const teardown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop()
        } catch {
          /* track may already be stopped */
        }
      }
      streamRef.current = null
    }
    const video = videoRef.current
    if (video) {
      try {
        video.pause()
      } catch {
        /* ignore */
      }
      video.srcObject = null
    }
  }, [])

  /** Show a transient hint without spamming (debounced by HINT_DURATION_MS). */
  const showHint = useCallback((message: string) => {
    if (!mountedRef.current) return
    if (hintTimerRef.current) return // already showing a hint — don't spam
    setHint(message)
    hintTimerRef.current = setTimeout(() => {
      hintTimerRef.current = null
      if (mountedRef.current) setHint(null)
    }, HINT_DURATION_MS)
  }, [])

  /** Single scan tick: grab a frame, decode, route on a passport match. */
  const scanFrame = useCallback(async () => {
    if (!mountedRef.current || navigatedRef.current) return
    if (scanningRef.current) return // previous decode still running
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState < 2 || video.videoWidth === 0) return // not enough data yet

    scanningRef.current = true
    try {
      // Cap the longest edge at MAX_FRAME_DIMENSION while preserving aspect ratio.
      const intrinsicW = video.videoWidth
      const intrinsicH = video.videoHeight
      const scale = Math.min(1, MAX_FRAME_DIMENSION / Math.max(intrinsicW, intrinsicH))
      const w = Math.max(1, Math.round(intrinsicW * scale))
      const h = Math.max(1, Math.round(intrinsicH * scale))

      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(video, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)

      const raw = await decodeQrFromImageData(imageData)
      if (!raw) return
      if (!mountedRef.current || navigatedRef.current) return

      const path = extractPassportConnectPath(raw)
      if (path) {
        // SUCCESS: stop everything, then navigate in-app. We do NOT call any
        // connect API — the destination passport page performs the auto-connect.
        navigatedRef.current = true
        teardown()
        log.userAction('passport-qr-scanned', undefined, {
          component: 'PassportScanner',
          action: 'navigate',
        })
        router.push(path)
        onClose()
      } else {
        // A QR was found but it isn't an Adventure Log passport.
        showHint("That's not an Adventure Log passport — try again")
      }
    } catch (error) {
      log.error(
        'QR scan tick failed',
        { component: 'PassportScanner', action: 'scan-frame' },
        error,
      )
    } finally {
      scanningRef.current = false
    }
  }, [router, onClose, teardown, showHint])

  // Acquire the rear camera and start the scan loop on mount.
  useEffect(() => {
    mountedRef.current = true
    navigatedRef.current = false

    async function start() {
      // Guard against insecure context / unsupported browsers.
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (mountedRef.current) setStatus('denied')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })

        // Component may have unmounted while awaiting permission.
        if (!mountedRef.current) {
          for (const track of stream.getTracks()) track.stop()
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          try {
            await video.play()
          } catch {
            // Autoplay can reject on some browsers; the stream is still attached
            // and playsInline/muted should let it render. Not fatal.
          }
        }

        if (!mountedRef.current) return
        setStatus('scanning')

        intervalRef.current = setInterval(() => {
          void scanFrame()
        }, SCAN_INTERVAL_MS)
      } catch (error) {
        log.error(
          'getUserMedia rejected',
          { component: 'PassportScanner', action: 'get-camera' },
          error,
        )
        if (mountedRef.current) setStatus('denied')
      }
    }

    void start()

    return () => {
      mountedRef.current = false
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current)
        hintTimerRef.current = null
      }
      teardown()
    }
  }, [scanFrame, teardown])

  // Focus the close button on mount + Esc to close.
  useEffect(() => {
    closeButtonRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan a passport"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-black/90 backdrop-blur-sm"
    >
      {/* Hidden offscreen canvas used only for frame capture. */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Header */}
      <header className="relative w-full px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 text-center">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Scan a passport
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Point at a friend&apos;s Adventure Log passport
        </p>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="absolute right-4 top-[max(1.25rem,env(safe-area-inset-top))] inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white outline-none transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[var(--color-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Body */}
      <main className="flex w-full flex-1 flex-col items-center justify-center px-6">
        {status === 'denied' ? (
          <div className="max-w-sm rounded-2xl border border-white/10 bg-[var(--card)] p-6 text-center shadow-xl">
            <p className="text-base font-medium text-[var(--color-ink)]">
              Camera access is needed to scan.
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted-warm)]">
              Allow camera access and try again.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-coral)] px-6 text-sm font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-coral)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Viewfinder */}
            <div className="relative aspect-square w-full max-w-[18rem] overflow-hidden rounded-3xl">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* Dim overlay until the stream is live */}
              {status === 'initializing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="text-sm text-white/70">Starting camera…</span>
                </div>
              )}

              {/* Coral corner accents */}
              <CornerAccents />
            </div>

            {/* Inline hint (non-passport QR). aria-live so SRs announce it. */}
            <div className="mt-6 h-6" aria-live="polite">
              {hint && (
                <p className="text-center text-sm font-medium text-[var(--color-coral-soft)]">
                  {hint}
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer spacer keeps the layout balanced + respects safe area */}
      <footer className="w-full pb-[max(1.5rem,env(safe-area-inset-bottom))]" />
    </div>
  )
}

/** Four coral L-shaped corner brackets framing the viewfinder. */
function CornerAccents() {
  const base =
    'pointer-events-none absolute h-9 w-9 border-[var(--color-coral)]'
  return (
    <>
      <span className={`${base} left-3 top-3 rounded-tl-xl border-l-[3px] border-t-[3px]`} />
      <span className={`${base} right-3 top-3 rounded-tr-xl border-r-[3px] border-t-[3px]`} />
      <span className={`${base} bottom-3 left-3 rounded-bl-xl border-b-[3px] border-l-[3px]`} />
      <span className={`${base} bottom-3 right-3 rounded-br-xl border-b-[3px] border-r-[3px]`} />
    </>
  )
}
