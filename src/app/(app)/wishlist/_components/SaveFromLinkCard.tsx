'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Loader2, MapPinned, Plus, Sparkles, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiFetch } from '@/lib/api/client'
import { features } from '@/lib/config/features'
import type { AddPlaceParams, ExtractResult } from '@/lib/links/place-types'
import { ReviewPlacesModal } from './ReviewPlacesModal'

const MANUAL_RESULT: ExtractResult = {
  platform: 'manual',
  sourceUrl: '',
  thumbnailUrl: null,
  caption: null,
  candidates: [],
  detectedNames: [],
  needsManual: true,
  message: 'Search for any place to add it to your wishlist.',
}

interface SaveFromLinkCardProps {
  onSave: (params: AddPlaceParams) => Promise<void>
}

export function SaveFromLinkCard({ onSave }: SaveFromLinkCardProps) {
  const router = useRouter()
  const [linkUrl, setLinkUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [reviewResult, setReviewResult] = useState<ExtractResult | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const handlePaste = async () => {
    const url = linkUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Paste a full link starting with http')
      return
    }

    setExtracting(true)
    try {
      const response = await apiFetch('/api/wishlist/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 402 && errorData.code === 'UPGRADE_REQUIRED') {
          toast.error(errorData.error || 'Upgrade to Pro for unlimited link imports', {
            action: {
              label: 'See Pro',
              onClick: () => router.push(errorData.upgradeUrl || '/pro'),
            },
            duration: 8000,
          })
          return
        }
        throw new Error(errorData.error || 'Could not read that link')
      }

      const result: ExtractResult = await response.json()
      setReviewResult(result)
      setReviewOpen(true)
      setLinkUrl('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read that link')
    } finally {
      setExtracting(false)
    }
  }

  const openManual = () => {
    setReviewResult(MANUAL_RESULT)
    setReviewOpen(true)
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-resting)] sm:p-6">
        <div aria-hidden className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--color-coral)]/10 text-[color:var(--color-coral)]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h2 className="font-heading text-lg font-semibold text-foreground">Turn a link into a place</h2>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Google Maps pins directly. TikTok uses AI to identify the place, then asks you to confirm it.
              </p>
            </div>
            {!features.aiLinkExtract && (
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Coming soon</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Supported links">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              <MapPinned className="h-3.5 w-3.5 text-primary" /> Google Maps · instant
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
              <Video className="h-3.5 w-3.5 text-[color:var(--color-coral)]" /> TikTok · AI assisted
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handlePaste()
                  }
                }}
                placeholder="Paste a TikTok or Google Maps link"
                className="h-12 rounded-2xl pl-11"
                disabled={!features.aiLinkExtract}
                aria-label="TikTok or Google Maps link"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePaste}
                disabled={!features.aiLinkExtract || extracting || !linkUrl.trim()}
                variant="coral"
                className="h-12 shrink-0 gap-2 rounded-2xl px-5"
              >
                {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {extracting ? 'Reading…' : 'Find place'}
              </Button>
              <Button onClick={openManual} variant="secondary" className="h-12 shrink-0 gap-2 rounded-2xl px-4">
                <Plus className="h-4 w-4" />
                {features.aiLinkExtract ? 'Manual' : 'Add a place'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <ReviewPlacesModal
        result={reviewResult}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSave={onSave}
      />
    </>
  )
}
