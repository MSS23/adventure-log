'use client'

import { useMemo, useState } from 'react'
import { useSavedPlaces, type SavedPlace, type ExtractResult, type AddPlaceParams } from '@/lib/hooks/useSavedPlaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import { Link2, Loader2, Sparkles, Trash2, ExternalLink, Check, MapPinned, Plus, Luggage } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { getFlagEmoji, getCountryName } from '@/lib/utils/country'
import { categoryConfig, platformLabel } from './savedPlacesConfig'
import { ReviewPlacesModal } from './ReviewPlacesModal'
import { AddToTripDialog } from './AddToTripDialog'

const MANUAL_RESULT: ExtractResult = {
  platform: 'manual',
  sourceUrl: '',
  thumbnailUrl: null,
  caption: null,
  candidates: [],
  detectedNames: [],
  needsManual: true,
  message: 'Search for any place to add it to your board.',
}

export function SavedPlacesSection() {
  const { places, loading, provisioned, extractFromLink, addPlace, removePlace, updatePlace } = useSavedPlaces()

  const [linkUrl, setLinkUrl] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [reviewResult, setReviewResult] = useState<ExtractResult | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [tripPlace, setTripPlace] = useState<SavedPlace | null>(null)

  const handlePaste = async () => {
    const url = linkUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Paste a full link starting with http')
      return
    }
    setExtracting(true)
    try {
      const result = await extractFromLink(url)
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

  const handleSave = async (params: AddPlaceParams) => {
    await addPlace(params)
  }

  const handleRemove = async (id: string) => {
    try {
      await removePlace(id)
      toast.success('Removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const handleToggleVisited = async (place: SavedPlace) => {
    try {
      await updatePlace(place.id, { visited_at: place.visited_at ? null : new Date().toISOString() })
    } catch {
      toast.error('Failed to update')
    }
  }

  // Group by country (desc by count), then by city within each country.
  const grouped = useMemo(() => {
    const byCountry = new Map<string, SavedPlace[]>()
    for (const p of places) {
      const key = p.country_code || 'XX'
      const arr = byCountry.get(key)
      if (arr) arr.push(p)
      else byCountry.set(key, [p])
    }
    return [...byCountry.entries()]
      .map(([code, items]) => {
        const byCity = new Map<string, SavedPlace[]>()
        for (const p of items) {
          const city = p.city || 'Other'
          const arr = byCity.get(city)
          if (arr) arr.push(p)
          else byCity.set(city, [p])
        }
        return { code, items, cities: [...byCity.entries()].sort((a, b) => a[0].localeCompare(b[0])) }
      })
      .sort((a, b) => b.items.length - a.items.length)
  }, [places])

  return (
    <div className="space-y-6">
      {/* ── Paste a link ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-[color:var(--color-coral)]" />
          <h3 className="font-heading text-base font-semibold text-foreground">Save a place from a link</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Paste a TikTok or Google Maps link — we&apos;ll work out the place and you confirm before it&apos;s saved.
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
            <Button onClick={handlePaste} disabled={extracting || !linkUrl.trim()} variant="coral" className="gap-2 shrink-0">
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

      {!provisioned && (
        <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
          Saving is disabled until database migration 55 is applied. You can still try the link reader above.
        </p>
      )}

      {/* ── Board ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : places.length === 0 ? (
        <EnhancedEmptyState
          icon={<MapPinned className="h-12 w-12" />}
          title="No saved places yet"
          description="Paste a TikTok or Google Maps link above to start your map of things to do and see."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.code}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl leading-none">
                  {group.code === 'XX' ? '🌍' : getFlagEmoji(group.code)}
                </span>
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {group.code === 'XX' ? 'Other' : getCountryName(group.code)}
                </h3>
                <span className="text-xs font-mono text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? 'place' : 'places'}
                </span>
              </div>

              <div className="space-y-5">
                {group.cities.map(([city, cityPlaces]) => (
                  <div key={city}>
                    {group.cities.length > 1 && (
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 pl-0.5">
                        {city}
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <AnimatePresence mode="popLayout">
                        {cityPlaces.map((place) => (
                          <PlaceCard
                            key={place.id}
                            place={place}
                            onRemove={handleRemove}
                            onToggleVisited={handleToggleVisited}
                            onAddToTrip={setTripPlace}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReviewPlacesModal
        result={reviewResult}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onSave={handleSave}
      />

      <AddToTripDialog place={tripPlace} open={tripPlace !== null} onClose={() => setTripPlace(null)} />
    </div>
  )
}

function PlaceCard({
  place,
  onRemove,
  onToggleVisited,
  onAddToTrip,
}: {
  place: SavedPlace
  onRemove: (id: string) => void
  onToggleVisited: (place: SavedPlace) => void
  onAddToTrip: (place: SavedPlace) => void
}) {
  const cat = categoryConfig[place.category]
  const CatIcon = cat.icon
  const visited = !!place.visited_at

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden flex flex-col"
    >
      {place.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element -- external TikTok CDN host, avoid next/image domain config
        <img
          src={place.thumbnail_url}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-28 object-cover"
        />
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`text-sm font-semibold leading-snug ${visited ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {place.place_name}
          </h4>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${cat.badge}`}>
            <CatIcon className="h-3 w-3" />
            {cat.label}
          </span>
        </div>

        {place.location_name && (
          <p className="text-xs text-muted-foreground truncate">{place.location_name}</p>
        )}
        {place.notes && <p className="text-xs text-foreground/80 line-clamp-2">{place.notes}</p>}

        <div className="mt-auto flex items-center justify-between pt-1">
          {place.source_url ? (
            <a
              href={place.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {platformLabel[place.source_platform]}
            </a>
          ) : (
            <span className="text-[11px] text-muted-foreground">{platformLabel[place.source_platform]}</span>
          )}

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAddToTrip(place)}
              aria-label="Add to a trip"
              title="Add to a trip"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Luggage className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onToggleVisited(place)}
              aria-label={visited ? 'Mark as not visited' : 'Mark as visited'}
              title={visited ? 'Visited' : 'Mark visited'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                visited ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(place.id)}
              aria-label="Remove place"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
