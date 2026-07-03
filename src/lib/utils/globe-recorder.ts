/**
 * Canvas → video recording for the Wrapped flyover export.
 *
 * Pipeline: the WebGL globe canvas is drawn (cover-cropped) onto an offscreen
 * 1080x1920 compositor canvas on a rAF loop together with a watermark, and
 * the COMPOSITOR's captureStream feeds a MediaRecorder. Recording the
 * compositor instead of the raw globe canvas is what bakes the watermark and
 * the 9:16 vertical framing into the file.
 *
 * The globe's renderer must be created with preserveDrawingBuffer: true for
 * the duration of the export run — without it, drawImage() from a WebGL
 * canvas reads a cleared buffer on most browsers (the rAF ordering between
 * three.js's render and our compositor draw is not guaranteed).
 *
 * Everything here feature-detects: Safari < 14.1 has no MediaRecorder for
 * canvas streams, and captureStream itself is missing in some WebViews.
 * canRecordVideo() returning false means the UI should hide the button.
 */

// Preference order matters: mp4 shares cleanly into TikTok/IG on every
// platform; webm needs re-encoding by some share targets. Chrome 126+ and
// recent Android WebViews pass isTypeSupported('video/mp4').
const MIME_CANDIDATES = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'] as const

export interface CanvasRecording {
  /** MIME type actually used (may include codec parameters). */
  mimeType: string
  /** Stops the recorder, releases the stream, resolves with the video. */
  stop(): Promise<Blob>
}

export interface WatermarkCompositor {
  /** The 1080x1920 canvas to hand to startRecording(). */
  canvas: HTMLCanvasElement
  /** Cancels the rAF draw loop. */
  stop(): void
}

function pickSupportedMimeType(): string | null {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof MediaRecorder.isTypeSupported !== 'function'
  ) {
    return null
  }
  for (const type of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type
    } catch {
      // Some older implementations throw on unknown containers — keep probing.
    }
  }
  return null
}

/** True when this browser can record a canvas to a supported video format. */
export function canRecordVideo(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof (HTMLCanvasElement.prototype as { captureStream?: unknown })
      .captureStream === 'function' &&
    pickSupportedMimeType() !== null
  )
}

/** File extension matching a mimeType returned by startRecording(). */
export function extensionForMimeType(mimeType: string): 'mp4' | 'webm' {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
}

/**
 * Starts recording a canvas at 30fps. Returns null when unsupported
 * (Safari without captureStream/MediaRecorder) so callers can bail cleanly.
 */
export function startRecording(canvas: HTMLCanvasElement): CanvasRecording | null {
  if (!canRecordVideo()) return null
  const mimeType = pickSupportedMimeType()
  if (!mimeType) return null

  let stream: MediaStream
  try {
    stream = canvas.captureStream(30)
  } catch {
    return null
  }

  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    })
  } catch {
    // Bitrate/type combo rejected — retry with browser defaults before giving up.
    try {
      recorder = new MediaRecorder(stream)
    } catch {
      stream.getTracks().forEach((t) => t.stop())
      return null
    }
  }

  const chunks: Blob[] = []
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  // Timeslice so long flights stream into chunks instead of one giant buffer.
  recorder.start(1000)

  const finalMime = recorder.mimeType || mimeType
  let stopped: Promise<Blob> | null = null

  return {
    mimeType: finalMime,
    stop() {
      if (!stopped) {
        stopped = new Promise<Blob>((resolve, reject) => {
          const finalize = () => {
            stream.getTracks().forEach((t) => t.stop())
            // Strip codec parameters for the blob type — File/share targets
            // want a plain container type like video/webm.
            resolve(new Blob(chunks, { type: finalMime.split(';')[0] }))
          }
          if (recorder.state === 'inactive') {
            finalize()
            return
          }
          recorder.onstop = finalize
          recorder.onerror = () => {
            stream.getTracks().forEach((t) => t.stop())
            reject(new Error('MediaRecorder failed while recording'))
          }
          try {
            recorder.stop()
          } catch (err) {
            stream.getTracks().forEach((t) => t.stop())
            reject(err instanceof Error ? err : new Error('Failed to stop recorder'))
          }
        })
      }
      return stopped
    },
  }
}

/**
 * Offscreen 9:16 compositor: draws `source` cover-cropped + a two-line
 * watermark near the bottom, repainting every animation frame. Record the
 * returned `canvas`, and call `stop()` when the recording ends.
 */
export function createWatermarkCompositor(
  source: HTMLCanvasElement,
  opts: { title: string; subtitle: string }
): WatermarkCompositor | null {
  if (typeof document === 'undefined') return null

  const width = 1080
  const height = 1920
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // The app's sans font is loaded via next/font under a hashed family name;
  // resolve it from the CSS variable so the watermark matches the UI.
  const appSans = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-dm-sans')
    .trim()
  const fontStack = `${appSans ? `${appSans}, ` : ''}'DM Sans', 'Inter', -apple-system, system-ui, sans-serif`

  let raf = 0
  const draw = () => {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    const sw = source.width
    const sh = source.height
    if (sw > 0 && sh > 0) {
      // Cover-crop: scale the globe frame up until it fills 9:16, centered.
      const scale = Math.max(width / sw, height / sh)
      const dw = sw * scale
      const dh = sh * scale
      try {
        ctx.drawImage(source, (width - dw) / 2, (height - dh) / 2, dw, dh)
      } catch {
        // Source can be transiently zero-sized during orientation changes.
      }
    }

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
    ctx.shadowBlur = 14
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.font = `600 40px ${fontStack}`
    ctx.fillText(opts.title, width / 2, height - 160)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.68)'
    ctx.font = `400 30px ${fontStack}`
    ctx.fillText(opts.subtitle, width / 2, height - 108)
    ctx.restore()

    raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)

  return {
    canvas,
    stop: () => cancelAnimationFrame(raf),
  }
}
