'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Compass, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PassportQrCodeProps {
  url: string
  size?: number
  label?: string
  className?: string
}

/**
 * The single QR renderer used by both private and public passport surfaces.
 * Keeping generation and error handling here prevents the two passport cards
 * from drifting visually or behaving differently when `qrcode` fails to load.
 */
export function PassportQrCode({
  url,
  size = 180,
  label = 'Roamkeep passport QR code',
  className,
}: PassportQrCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setQrDataUrl(null)
    setFailed(false)

    if (!url) return () => { cancelled = true }

    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, {
          width: size * 2,
          margin: 2,
          color: { dark: '#2d3a1a', light: '#ffffff' },
          // High correction makes phone-to-phone scans much more dependable
          // through glare, low brightness, and slightly damaged screenshots.
          errorCorrectionLevel: 'H',
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [url, size])

  if (failed) {
    return (
      <div
        role="status"
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-center',
          className,
        )}
        style={{ width: size, height: size }}
      >
        <QrCode className="size-7 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">QR code unavailable</span>
      </div>
    )
  }

  if (!qrDataUrl) {
    return (
      <div
        role="status"
        aria-label="Preparing passport QR code"
        className={cn('animate-pulse rounded-2xl border border-border bg-muted', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm">
        <Image
          src={qrDataUrl}
          alt={label}
          width={size}
          height={size}
          className="block rounded-xl"
          unoptimized
        />
      </div>
      <div className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-full bg-primary ring-2 ring-background">
        <Compass className="size-4 text-primary-foreground" aria-hidden />
      </div>
    </div>
  )
}
