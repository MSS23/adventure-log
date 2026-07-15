'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Calendar, Camera, ExternalLink, MapPin, Navigation, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'
import { apiFetch } from '@/lib/api/client'

interface GeocodeSearchResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  address?: { country_code?: string }
}

export interface GlobeSearchResult {
  id: string
  name: string
  latitude: number
  longitude: number
  country: string
  visitDate: string
  albumCount: number
  photoCount: number
  coverPhotoUrl?: string
  tags: string[]
  type: 'location' | 'country' | 'year' | 'external'
  isExternal?: boolean
}

interface GlobeSearchProps {
  data: GlobeSearchResult[]
  onResultClick: (result: GlobeSearchResult) => void
  onClearSearch: () => void
  placeholder?: string
  maxResults?: number
  className?: string
}

export function GlobeSearch({
  data,
  onResultClick,
  onClearSearch,
  placeholder = 'Fly to a city, country, or travel year',
  maxResults = 8,
  className,
}: GlobeSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobeSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [searchingExternal, setSearchingExternal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const quickSuggestions = useMemo(() => {
    const suggestions: string[] = []
    for (const item of data) {
      const candidate = item.country || item.name
      if (candidate && !suggestions.includes(candidate)) suggestions.push(candidate)
      if (suggestions.length === 4) break
    }
    return suggestions
  }, [data])

  const searchData = useCallback((searchQuery: string): GlobeSearchResult[] => {
    if (!searchQuery.trim()) return []
    const normalizedQuery = searchQuery.toLowerCase().trim()

    return data
      .filter((item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.country.toLowerCase().includes(normalizedQuery) ||
        item.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        item.visitDate.includes(normalizedQuery)
      )
      .sort((a, b) => {
        const aStartsWith = a.name.toLowerCase().startsWith(normalizedQuery)
        const bStartsWith = b.name.toLowerCase().startsWith(normalizedQuery)
        if (aStartsWith && !bStartsWith) return -1
        if (!aStartsWith && bStartsWith) return 1
        return b.photoCount - a.photoCount
      })
      .slice(0, maxResults)
  }, [data, maxResults])

  const searchExternalLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) return

    setSearchingExternal(true)
    try {
      const response = await apiFetch(`/api/geocode?q=${encodeURIComponent(searchQuery)}`)
      if (!response.ok) throw new Error(`Geocode API error: ${response.status}`)
      const responseData: GeocodeSearchResult[] = await response.json()
      const externalResults = responseData
        .slice(0, 3)
        .map((result) => ({
          id: `external-${result.place_id}`,
          name: result.display_name.split(',')[0]?.trim() || searchQuery,
          latitude: Number.parseFloat(result.lat),
          longitude: Number.parseFloat(result.lon),
          country:
            result.address?.country_code?.toUpperCase() ||
            result.display_name.split(',').pop()?.trim() ||
            'Unknown',
          visitDate: new Date().toISOString(),
          albumCount: 0,
          photoCount: 0,
          tags: ['external'],
          type: 'external' as const,
          isExternal: true,
        }))
        .filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude))

      if (externalResults.length > 0) {
        setResults([...searchData(searchQuery), ...externalResults].slice(0, maxResults))
        setIsOpen(true)
      }
    } catch (error) {
      log.error(
        'External location search failed',
        { component: 'GlobeSearch', action: 'search-external' },
        error as Error
      )
    } finally {
      setSearchingExternal(false)
    }
  }, [maxResults, searchData])

  const handleResultSelect = useCallback((result: GlobeSearchResult) => {
    setQuery('')
    setIsOpen(false)
    setIsFocused(false)
    setSelectedIndex(-1)
    onResultClick(result)
    inputRef.current?.blur()
  }, [onResultClick])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setIsOpen(false)
    setSelectedIndex(-1)
    onClearSearch()
  }, [onClearSearch])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const localResults = searchData(query)
    setResults(localResults)
    setIsOpen(localResults.length > 0)
    setSelectedIndex(-1)

    if (localResults.length === 0 && query.length >= 3) {
      const timeout = window.setTimeout(() => searchExternalLocations(query), 450)
      return () => window.clearTimeout(timeout)
    }
  }, [query, searchData, searchExternalLocations])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((index) => Math.min(index + 1, results.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((index) => Math.max(index - 1, -1))
      } else if (event.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
        event.preventDefault()
        handleResultSelect(results[selectedIndex])
      } else if (event.key === 'Escape') {
        event.preventDefault()
        handleClear()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClear, handleResultSelect, isOpen, results, selectedIndex])

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement | undefined
      selectedElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedIndex])

  useEffect(() => {
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsFocused(false)
        if (!query) setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleOutsidePointer)
    return () => document.removeEventListener('pointerdown', handleOutsidePointer)
  }, [query])

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

  const getResultIcon = (result: GlobeSearchResult) => {
    if (result.type === 'country') return <Navigation className="h-4 w-4" />
    if (result.type === 'year') return <Calendar className="h-4 w-4" />
    if (result.type === 'external') return <ExternalLink className="h-4 w-4" />
    return <MapPin className="h-4 w-4" />
  }

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-lg', className)}>
      <div className="relative rounded-2xl border border-white/15 bg-[#171a16]/94 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/65" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          aria-label="Search the travel globe"
          className="h-11 rounded-xl border-0 bg-white/[0.07] pl-11 pr-11 text-sm text-white shadow-none placeholder:text-white/45 focus-visible:ring-1 focus-visible:ring-white/35"
        />
        {searchingExternal && (
          <div className="absolute right-12 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        )}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            aria-label="Clear globe search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full z-40 mt-2 w-full overflow-hidden rounded-2xl border border-white/12 bg-[#171a16]/96 p-1.5 text-white shadow-[0_22px_60px_rgba(0,0,0,0.46)] backdrop-blur-xl">
          <div ref={resultsRef} className="max-h-80 overflow-y-auto" role="listbox">
            {results.map((result, index) => (
              <button
                type="button"
                key={result.id}
                onClick={() => handleResultSelect(result)}
                className={cn(
                  'flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.08] focus-visible:ring-1 focus-visible:ring-white/35',
                  selectedIndex === index && 'bg-white/[0.1]'
                )}
                role="option"
                aria-selected={selectedIndex === index}
              >
                <div className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/[0.08] text-white/75">
                  {result.coverPhotoUrl ? (
                    <Image src={result.coverPhotoUrl} alt="" fill className="object-cover" sizes="48px" />
                  ) : (
                    getResultIcon(result)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{result.name}</span>
                    {result.isExternal && <ExternalLink className="h-3 w-3 shrink-0 text-white/45" />}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/55">
                    {result.country} · {result.isExternal ? 'Explore anywhere' : formatDate(result.visitDate)}
                  </p>
                  {!result.isExternal && (
                    <p className="mt-1 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.1em] text-white/45">
                      <span className="inline-flex items-center gap-1"><Camera className="h-3 w-3" />{result.photoCount} photos</span>
                      <span>{result.albumCount} album{result.albumCount === 1 ? '' : 's'}</span>
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
          {results.length === maxResults && (
            <p className="border-t border-white/10 px-3 py-2 text-center text-[11px] text-white/45">
              Showing the closest {maxResults} matches
            </p>
          )}
        </div>
      )}

      {query.length >= 2 && results.length === 0 && !searchingExternal && (
        <div className="absolute top-full z-40 mt-2 w-full rounded-2xl border border-white/12 bg-[#171a16]/96 px-5 py-6 text-center text-white shadow-[0_22px_60px_rgba(0,0,0,0.46)] backdrop-blur-xl">
          <MapPin className="mx-auto mb-2 h-5 w-5 text-white/40" />
          <p className="text-sm font-semibold">No place found</p>
          <p className="mt-1 text-xs text-white/50">Try a nearby city, country, or travel year.</p>
        </div>
      )}

      {!query && isFocused && quickSuggestions.length > 0 && (
        <div className="absolute top-full z-40 mt-2 w-full rounded-2xl border border-white/12 bg-[#171a16]/96 p-4 text-white shadow-[0_22px_60px_rgba(0,0,0,0.46)] backdrop-blur-xl">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Jump back to</p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setQuery(suggestion)}
                className="min-h-9 rounded-full border border-white/12 bg-white/[0.06] px-3 text-xs font-medium text-white/75 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
