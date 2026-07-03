'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search, X, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api/client'
import { log } from '@/lib/utils/logger'
import { useCreateRecommendation } from '@/lib/hooks/usePlaceRecommendations'
import { PLACE_TYPE_CONFIG, PLACE_TYPE_ORDER } from './place-type'
import type { PlaceType } from '@/types/database'

interface CreateRecommendationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional defaults from the currently-browsed destination. */
  defaultCity?: string
  defaultCountryCode?: string
}

/** Shape of a Nominatim result returned by `/api/geocode?q=` (addressdetails=1). */
interface GeocodeResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    municipality?: string
    county?: string
    state?: string
    country?: string
    country_code?: string
  }
}

interface PickedPlace {
  latitude: number
  longitude: number
  city: string
  country_code?: string
  location_name: string
}

/** Derive a human city name from a Nominatim address object. */
function extractCity(addr: GeocodeResult['address']): string {
  if (!addr) return ''
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    addr.country ||
    ''
  )
}

function toPickedPlace(result: GeocodeResult): PickedPlace {
  const addr = result.address
  const city = extractCity(addr)
  return {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    city: city || result.display_name.split(',')[0]?.trim() || result.display_name,
    country_code: addr?.country_code ? addr.country_code.toUpperCase() : undefined,
    location_name: result.display_name,
  }
}

export function CreateRecommendationModal({
  open,
  onOpenChange,
  defaultCity,
  defaultCountryCode,
}: CreateRecommendationModalProps) {
  const createRecommendation = useCreateRecommendation()

  const [title, setTitle] = useState('')
  const [placeType, setPlaceType] = useState<PlaceType>('eat')
  const [tip, setTip] = useState('')

  // Place search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [picked, setPicked] = useState<PickedPlace | null>(null)
  // Index of the keyboard-active option in the combobox listbox (-1 = none).
  const [activeIndex, setActiveIndex] = useState(-1)
  // True once a non-trivial query has been typed (drives "No places found" SR text).
  const queryEntered = query.trim().length >= 3

  const [formError, setFormError] = useState<string | null>(null)
  // Tracks which field failed the last validation so we can mark aria-invalid +
  // wire aria-describedby to the error message.
  const [invalidField, setInvalidField] = useState<'title' | 'place' | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // The `Input` UI primitive doesn't forward refs, so we move focus to invalid
  // fields by id instead of holding a ref to the underlying <input>.
  const focusFieldById = (id: string) => {
    if (typeof document === 'undefined') return
    const el = document.getElementById(id)
    if (el instanceof HTMLElement) el.focus()
  }

  // Reset everything when the modal closes so re-opening is clean.
  useEffect(() => {
    if (!open) {
      setTitle('')
      setPlaceType('eat')
      setTip('')
      setQuery('')
      setResults([])
      setShowResults(false)
      setActiveIndex(-1)
      setPicked(null)
      setFormError(null)
      setInvalidField(null)
      createRecommendation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Debounced geocode search against the existing /api/geocode endpoint.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (picked || query.trim().length < 3) {
      setResults([])
      setShowResults(false)
      setActiveIndex(-1)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await apiFetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`)
        if (!res.ok) throw new Error(`Geocode failed (${res.status})`)
        const data = (await res.json()) as GeocodeResult[]
        setResults(Array.isArray(data) ? data : [])
        setShowResults(true)
        setActiveIndex(-1)
      } catch (error) {
        log.error('Place search failed', {
          component: 'CreateRecommendationModal',
          action: 'geocode',
        }, error as Error)
        setResults([])
        setShowResults(true)
        setActiveIndex(-1)
      } finally {
        setSearching(false)
      }
    }, 450)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, picked])

  // Keep the keyboard-active option visible within the scrollable listbox.
  useEffect(() => {
    if (activeIndex < 0) return
    const el = document.getElementById(`rec-place-option-${activeIndex}`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handlePick = (result: GeocodeResult) => {
    setPicked(toPickedPlace(result))
    setShowResults(false)
    setResults([])
    setActiveIndex(-1)
    // A pick satisfies the "place required" rule — clear any stale error state.
    if (invalidField === 'place') {
      setInvalidField(null)
      setFormError(null)
    }
  }

  const clearPick = () => {
    setPicked(null)
    setQuery('')
  }

  // Stable DOM id for each result option so aria-activedescendant can target it.
  const optionId = (index: number) => `rec-place-option-${index}`

  // ARIA combobox keyboard model: Arrow keys move the active option, Enter
  // selects it, Escape dismisses the listbox. Activedescendant (not real focus)
  // drives selection, so the input keeps focus throughout.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) {
      if (e.key === 'Escape' && showResults) {
        e.preventDefault()
        setShowResults(false)
        setActiveIndex(-1)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % results.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1))
        break
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < results.length) {
          e.preventDefault()
          handlePick(results[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowResults(false)
        setActiveIndex(-1)
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setInvalidField(null)

    if (!title.trim()) {
      setFormError('Give your recommendation a title.')
      setInvalidField('title')
      focusFieldById('rec-title')
      return
    }
    if (!picked) {
      setFormError('Search for and pick a place so others can find it.')
      setInvalidField('place')
      focusFieldById('rec-place-search')
      return
    }

    try {
      await createRecommendation.mutateAsync({
        title: title.trim(),
        place_type: placeType,
        tip: tip.trim() || undefined,
        city: picked.city,
        country_code: picked.country_code,
        location_name: picked.location_name,
        latitude: picked.latitude,
        longitude: picked.longitude,
      })
      onOpenChange(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to add recommendation')
    }
  }

  const submitting = createRecommendation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[color:var(--color-ivory)] dark:bg-[#211B12]">
        <DialogHeader>
          <DialogTitle>Recommend a place</DialogTitle>
          <DialogDescription>
            Share a real spot — somewhere to eat, visit, stay, or an activity — so other
            travelers can find it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="rec-title"
              className="al-eyebrow text-[color:var(--color-muted-warm)]"
            >
              What do you recommend?
            </label>
            <Input
              id="rec-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Trattoria da Enzo"
              maxLength={200}
              autoComplete="off"
              aria-required="true"
              aria-invalid={invalidField === 'title' || undefined}
              aria-describedby={invalidField === 'title' ? 'rec-form-error' : undefined}
            />
          </div>

          {/* Place type — segmented control */}
          <div className="space-y-1.5">
            <span className="al-eyebrow block text-[color:var(--color-muted-warm)]">Type</span>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="group"
              aria-label="Place type"
            >
              {PLACE_TYPE_ORDER.map((type) => {
                const config = PLACE_TYPE_CONFIG[type]
                const Icon = config.icon
                const selected = placeType === type
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPlaceType(type)}
                    className={cn(
                      'flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[12px] font-semibold transition-colors outline-none',
                      'focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-ivory)] dark:focus-visible:ring-offset-[#211B12]',
                      selected
                        ? config.badge
                        : 'border-[color:var(--color-line-warm)] bg-white text-[color:var(--color-ink-soft)] hover:bg-black/[0.03] dark:bg-white/[0.04] dark:border-white/[0.1] dark:text-stone-300'
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Place search */}
          <div className="space-y-1.5">
            <span className="al-eyebrow block text-[color:var(--color-muted-warm)]">Where is it?</span>

            {/* Screen-reader announcement of search status / result count. */}
            <span role="status" aria-live="polite" className="sr-only">
              {searching
                ? 'Searching…'
                : results.length
                  ? `${results.length} places found`
                  : queryEntered
                    ? 'No places found'
                    : ''}
            </span>

            {picked ? (
              <div className="flex items-start gap-2 rounded-xl border border-[color:var(--color-forest)]/30 bg-[color:var(--color-forest)]/[0.06] p-3 dark:bg-[color:var(--color-forest)]/15">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-forest)]"
                  strokeWidth={1.9}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[color:var(--color-ink)] dark:text-stone-100">
                    {picked.city}
                    {picked.country_code ? `, ${picked.country_code}` : ''}
                  </p>
                  <p className="truncate text-[12px] text-[color:var(--color-muted-warm)]">
                    {picked.location_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearPick}
                  aria-label="Change place"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[color:var(--color-muted-warm)] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted-warm)]"
                  strokeWidth={1.8}
                  aria-hidden
                />
                <Input
                  id="rec-place-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search a city, address, or landmark…"
                  className="pl-9 pr-9"
                  autoComplete="off"
                  aria-label="Search for a place"
                  role="combobox"
                  aria-expanded={showResults}
                  aria-controls="rec-place-results"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    activeIndex >= 0 ? optionId(activeIndex) : undefined
                  }
                  aria-required="true"
                  aria-invalid={invalidField === 'place' || undefined}
                  aria-describedby={
                    invalidField === 'place' ? 'rec-form-error' : undefined
                  }
                />
                {searching && (
                  <Loader2
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[color:var(--color-muted-warm)]"
                    aria-hidden
                  />
                )}

                {showResults && (
                  <ul
                    id="rec-place-results"
                    role="listbox"
                    aria-label="Place search results"
                    className="absolute left-0 right-0 z-50 mt-1.5 max-h-64 overflow-auto rounded-xl border border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] p-1.5 shadow-[0_12px_32px_rgba(26,20,14,0.14)] dark:bg-[#2A2318] dark:border-white/[0.1]"
                  >
                    {results.length === 0 && !searching && (
                      <li
                        aria-hidden="true"
                        className="px-3 py-3 text-center text-[13px] text-[color:var(--color-muted-warm)]"
                      >
                        No places found. Try a different search.
                      </li>
                    )}
                    {results.map((result, index) => {
                      const isActive = index === activeIndex
                      return (
                        <li key={result.place_id} role="presentation">
                          <button
                            type="button"
                            id={optionId(index)}
                            role="option"
                            aria-selected={isActive}
                            tabIndex={-1}
                            onClick={() => handlePick(result)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                              'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                              isActive
                                ? 'bg-black/[0.06] dark:bg-white/[0.1]'
                                : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                            )}
                          >
                            <MapPin
                              className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-muted-warm)]"
                              strokeWidth={1.8}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 text-[13px] leading-snug text-[color:var(--color-ink-soft)] dark:text-stone-300">
                              {result.display_name}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
            {!picked && (defaultCity || defaultCountryCode) && (
              <p className="text-[11.5px] text-[color:var(--color-muted-warm)]">
                Tip: searching for{' '}
                <span className="font-medium">{defaultCity || defaultCountryCode}</span> keeps
                this in the destination you&apos;re browsing.
              </p>
            )}
          </div>

          {/* Tip */}
          <div className="space-y-1.5">
            <label htmlFor="rec-tip" className="al-eyebrow text-[color:var(--color-muted-warm)]">
              Your tip <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <Textarea
              id="rec-tip"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="Why is it worth it? Best dish, best time to go, what to skip…"
              maxLength={1000}
              rows={3}
              className="rounded-xl border-[color:var(--color-line-warm)] bg-white dark:bg-white/[0.04] dark:border-white/[0.1]"
            />
          </div>

          {formError && (
            <p
              id="rec-form-error"
              role="alert"
              className="rounded-lg bg-[color:var(--color-coral)]/10 px-3 py-2 text-[13px] text-[color:var(--color-coral)]"
            >
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[140px]">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Adding…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Add recommendation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
