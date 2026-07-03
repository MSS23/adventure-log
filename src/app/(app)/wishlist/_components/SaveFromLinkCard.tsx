'use client'

/**
 * SaveFromLinkCard — paste a TikTok / Google Maps / Instagram link, let AI
 * extract the place(s), review them, and save straight into the wishlist.
 *
 * This is the surviving half of the old SavedPlacesSection: the board that
 * used to render alongside it is gone — saved places ARE wishlist items now
 * (migration 67), so confirmed places land in the same grid as everything
 * else.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link2, Loader2, Sparkles, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'
import type { ExtractResult, AddPlaceParams } from '@/lib/links/place-types'
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
  /** Persist a confirmed place (wired to useWishlist().addItem). */
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
      const res = await apiFetch('/api/wishlist/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Pro gate: free plan is limited to 10 AI link imports per month.
        if (res.status === 402 && err.code === 'UPGRADE_REQUIRED') {
          toast.error(err.error || 'Upgrade to Pro for unlimited link imports', {
            action: {
              label: 'See Pro',
              onClick: () => router.push(err.upgradeUrl || '/pro'),
            },
            duration: 8000,
          })
          return
        }
        throw new Error(err.error || 'Could not read that link')
      }
      const result: ExtractResult = await res.json()
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
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[color:var(--color-coral)]" />
          <h3 className="font-heading text-base font-semibold text-foreground">
            Save a place from a link
          </h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Paste a TikTok or Google Maps link — AI reads it and works out the place, then you
          confirm before it&apos;s added to your wishlist. Do check the details.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handlePaste()
                }
              }}
              placeholder="https://www.tiktok.com/@user/video/…  or  maps.app.goo.gl/…"
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePaste}
              disabled={extracting || !linkUrl.trim()}
              variant="coral"
              className="gap-2 shrink-0"
            >
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {extracting ? 'Reading…' : 'Find place'}
            </Button>
            <Button onClick={openManual} variant="secondary" className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Manual
            </Button>
          </div>
        </div>
      </div>

      <ReviewPlacesModal
        result={reviewResult}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSave={onSave}
      />
    </>
  )
}
