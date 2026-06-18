'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUpWideNarrow, Clock, Search, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRecommendationCities } from '@/lib/hooks/usePlaceRecommendations'
import type { RecommendationSort } from '@/lib/hooks/usePlaceRecommendations'
import { PLACE_TYPE_CONFIG, PLACE_TYPE_ORDER } from './place-type'
import type { PlaceType } from '@/types/database'

export interface RecommendationFilterState {
  type?: PlaceType
  sort: RecommendationSort
  city?: string
  countryCode?: string
  q?: string
}

interface RecommendationFiltersProps {
  value: RecommendationFilterState
  onChange: (next: RecommendationFilterState) => void
}

const chipBase =
  'inline-flex items-center gap-1.5 min-h-[44px] rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-ivory)] dark:focus-visible:ring-offset-[#1A140E]'

export function RecommendationFilters({ value, onChange }: RecommendationFiltersProps) {
  const { data: cities } = useRecommendationCities()
  const [cityOpen, setCityOpen] = useState(false)
  const cityTriggerRef = useRef<HTMLButtonElement>(null)
  const cityPopupRef = useRef<HTMLDivElement>(null)
  const cityPopupId = 'recommendation-destination-popup'

  const activeType = value.type
  const activeCityLabel = value.city
    ? [value.city, value.countryCode].filter(Boolean).join(', ')
    : 'All destinations'

  const setType = (type?: PlaceType) => onChange({ ...value, type })
  const setSort = (sort: RecommendationSort) => onChange({ ...value, sort })

  const closeCityAndRestoreFocus = () => {
    setCityOpen(false)
    cityTriggerRef.current?.focus()
  }

  const selectCity = (city?: { city: string; country_code: string | null }) => {
    onChange({
      ...value,
      city: city?.city,
      countryCode: city?.country_code || undefined,
    })
    setCityOpen(false)
  }

  // Close the destination popup on outside click (pointer) while open.
  useEffect(() => {
    if (!cityOpen) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        cityPopupRef.current?.contains(target) ||
        cityTriggerRef.current?.contains(target)
      ) {
        return
      }
      setCityOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [cityOpen])

  return (
    <div className="space-y-3">
      {/* Search + destination selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-muted-warm)]"
            strokeWidth={1.8}
            aria-hidden
          />
          <input
            type="text"
            value={value.q || ''}
            onChange={(e) => onChange({ ...value, q: e.target.value })}
            placeholder="Search tips by name or keyword…"
            aria-label="Search recommendations"
            className={cn(
              'h-10 w-full rounded-xl border border-[color:var(--color-line-warm)] bg-white pl-9 pr-9 text-[14px] text-[color:var(--color-ink)] outline-none transition-shadow',
              'placeholder:text-[color:var(--color-muted-warm)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]/40',
              'dark:bg-white/[0.04] dark:border-white/[0.1] dark:text-stone-100'
            )}
          />
          {value.q && (
            <button
              type="button"
              onClick={() => onChange({ ...value, q: '' })}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[color:var(--color-muted-warm)] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        {/* Destination selector */}
        <div className="relative">
          <button
            ref={cityTriggerRef}
            type="button"
            onClick={() => setCityOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={cityOpen}
            aria-controls={cityOpen ? cityPopupId : undefined}
            className={cn(
              'flex h-10 min-w-[180px] items-center justify-between gap-2 rounded-xl border px-3.5 text-[14px] font-medium outline-none transition-colors',
              'focus-visible:ring-2 focus-visible:ring-[color:var(--color-forest)]/40',
              value.city
                ? 'border-[color:var(--color-forest)]/40 bg-[color:var(--color-forest)]/[0.06] text-[color:var(--color-forest)] dark:bg-[color:var(--color-forest)]/15'
                : 'border-[color:var(--color-line-warm)] bg-white text-[color:var(--color-ink-soft)] dark:bg-white/[0.04] dark:border-white/[0.1] dark:text-stone-300'
            )}
          >
            <span className="truncate">{activeCityLabel}</span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 transition-transform', cityOpen && 'rotate-180')}
              strokeWidth={1.8}
              aria-hidden
            />
          </button>

          {cityOpen && (
            <div
              ref={cityPopupRef}
              id={cityPopupId}
              aria-label="Filter by destination"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  closeCityAndRestoreFocus()
                }
              }}
              className="absolute right-0 z-50 mt-1.5 max-h-72 w-[240px] overflow-auto rounded-xl border border-[color:var(--color-line-warm)] bg-[color:var(--color-ivory)] p-1.5 shadow-[0_12px_32px_rgba(26,20,14,0.14)] dark:bg-[#211B12] dark:border-white/[0.1]"
            >
              <button
                type="button"
                aria-current={!value.city ? 'true' : undefined}
                onClick={() => selectCity(undefined)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                  !value.city
                    ? 'bg-[color:var(--color-forest)]/10 font-semibold text-[color:var(--color-forest)]'
                    : 'text-[color:var(--color-ink-soft)] hover:bg-black/5 dark:text-stone-300 dark:hover:bg-white/[0.06]'
                )}
              >
                All destinations
              </button>
              {(cities || []).map((c) => {
                const selected = value.city === c.city && value.countryCode === (c.country_code || undefined)
                return (
                  <button
                    key={`${c.city}-${c.country_code ?? ''}`}
                    type="button"
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => selectCity(c)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                      selected
                        ? 'bg-[color:var(--color-forest)]/10 font-semibold text-[color:var(--color-forest)]'
                        : 'text-[color:var(--color-ink-soft)] hover:bg-black/5 dark:text-stone-300 dark:hover:bg-white/[0.06]'
                    )}
                  >
                    <span className="truncate">
                      {c.city}
                      {c.country_code ? `, ${c.country_code}` : ''}
                    </span>
                    <span className="shrink-0 rounded-full bg-black/5 px-1.5 text-[11px] tabular-nums text-[color:var(--color-muted-warm)] dark:bg-white/10">
                      {c.count}
                    </span>
                  </button>
                )
              })}
              {(cities || []).length === 0 && (
                <p className="px-3 py-2 text-[12px] text-[color:var(--color-muted-warm)]">
                  No destinations yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Type chips + sort toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by place type">
          <button
            type="button"
            onClick={() => setType(undefined)}
            aria-pressed={!activeType}
            className={cn(
              chipBase,
              !activeType
                ? 'bg-[color:var(--color-ink)] text-[color:var(--color-ivory)] dark:bg-stone-100 dark:text-stone-900'
                : 'bg-white text-[color:var(--color-ink-soft)] ring-1 ring-[color:var(--color-line-warm)] hover:bg-black/[0.03] dark:bg-white/[0.04] dark:text-stone-300 dark:ring-white/[0.1]'
            )}
          >
            All
          </button>
          {PLACE_TYPE_ORDER.map((type) => {
            const config = PLACE_TYPE_CONFIG[type]
            const Icon = config.icon
            const selected = activeType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setType(type)}
                aria-pressed={selected}
                className={cn(
                  chipBase,
                  selected
                    ? config.badge
                    : 'bg-white text-[color:var(--color-ink-soft)] ring-1 ring-[color:var(--color-line-warm)] hover:bg-black/[0.03] dark:bg-white/[0.04] dark:text-stone-300 dark:ring-white/[0.1]'
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
                {config.label}
              </button>
            )
          })}
        </div>

        {/* Sort toggle */}
        <div
          className="ml-auto inline-flex items-center rounded-full border border-[color:var(--color-line-warm)] bg-white p-0.5 dark:bg-white/[0.04] dark:border-white/[0.1]"
          role="group"
          aria-label="Sort recommendations"
        >
          <button
            type="button"
            onClick={() => setSort('top')}
            aria-pressed={value.sort === 'top'}
            className={cn(
              'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors',
              value.sort === 'top'
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-ivory)]'
                : 'text-[color:var(--color-ink-soft)] dark:text-stone-300'
            )}
          >
            <ArrowUpWideNarrow className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
            Top
          </button>
          <button
            type="button"
            onClick={() => setSort('new')}
            aria-pressed={value.sort === 'new'}
            className={cn(
              'inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors',
              value.sort === 'new'
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-ivory)]'
                : 'text-[color:var(--color-ink-soft)] dark:text-stone-300'
            )}
          >
            <Clock className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
            Newest
          </button>
        </div>
      </div>
    </div>
  )
}
