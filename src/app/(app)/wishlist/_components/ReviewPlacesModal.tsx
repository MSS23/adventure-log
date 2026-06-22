'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Loader2, MapPin, Search, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'
import { getFlagEmoji } from '@/lib/utils/country'
import { categoryConfig, CATEGORY_ORDER } from './savedPlacesConfig'
import type {
  ExtractResult,
  PlaceCandidate,
  PlaceCategory,
  AddPlaceParams,
} from '@/lib/hooks/useSavedPlaces'

interface ReviewPlacesModalProps {
  result: ExtractResult | null
  open: boolean
  onClose: () => void
  onSave: (params: AddPlaceParams) => Promise<void>
}

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  address?: { country_code?: string; city?: string; town?: string; village?: string; country?: string }
}

export function ReviewPlacesModal({ result, open, onClose, onSave }: ReviewPlacesModalProps) {
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([])
  const [savingIndex, setSavingIndex] = useState<number | null>(null)

  // Manual search fallback state
  const [manualQuery, setManualQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([])

  useEffect(() => {
    if (result) {
      setCandidates(result.candidates.map((c) => ({ ...c })))
      setManualQuery(result.detectedNames[0] || '')
      setSearchResults([])
    }
  }, [result])

  const platform = result?.platform ?? 'manual'

  const updateCandidate = (index: number, patch: Partial<PlaceCandidate>) => {
    setCandidates((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const buildParams = (c: PlaceCandidate): AddPlaceParams => ({
    place_name: c.placeName,
    location_name: c.locationName,
    city: c.city,
    country_code: c.countryCode,
    latitude: c.latitude,
    longitude: c.longitude,
    category: c.category,
    source_platform: platform,
    source_url: result?.sourceUrl ?? null,
    thumbnail_url: result?.thumbnailUrl ?? null,
  })

  const handleSaveCandidate = async (index: number) => {
    const c = candidates[index]
    if (!c.placeName.trim()) {
      toast.error('Give the place a name first')
      return
    }
    setSavingIndex(index)
    try {
      await onSave(buildParams(c))
      toast.success(`Saved ${c.placeName}`)
      setCandidates((prev) => prev.filter((_, i) => i !== index))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save place')
    } finally {
      setSavingIndex(null)
    }
  }

  const runManualSearch = async () => {
    const q = manualQuery.trim()
    if (!q) return
    setSearching(true)
    try {
      const res = await apiFetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Search failed')
      const data: NominatimResult[] = await res.json()
      setSearchResults(Array.isArray(data) ? data.slice(0, 6) : [])
      if (!data || data.length === 0) toast.message('No matching places found')
    } catch {
      toast.error('Location search failed')
    } finally {
      setSearching(false)
    }
  }

  const addFromSearch = (r: NominatimResult) => {
    const city = r.address?.city || r.address?.town || r.address?.village || null
    const candidate: PlaceCandidate = {
      placeName: r.display_name.split(',')[0]?.trim() || manualQuery.trim(),
      locationName:
        city && r.address?.country ? `${city}, ${r.address.country}` : r.display_name.split(',').slice(0, 2).join(', '),
      city,
      countryCode: r.address?.country_code ? r.address.country_code.toUpperCase() : null,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      category: 'see',
      confidence: 1,
    }
    setCandidates((prev) => [...prev, candidate])
    setSearchResults([])
    setManualQuery('')
  }

  const headerCopy = useMemo(() => {
    if (!result) return { title: 'Add a place', desc: '' }
    if (platform === 'tiktok') return { title: 'Review places from this TikTok', desc: result.caption || '' }
    if (platform === 'google_maps') return { title: 'Confirm this place', desc: '' }
    return { title: 'Add a place', desc: '' }
  }, [result, platform])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{headerCopy.title}</DialogTitle>
          {headerCopy.desc && (
            <DialogDescription className="line-clamp-2">{headerCopy.desc}</DialogDescription>
          )}
        </DialogHeader>

        {/* TikTok thumbnail */}
        {result?.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external TikTok CDN host, avoid next/image domain config
          <img
            src={result.thumbnailUrl}
            alt="Video thumbnail"
            referrerPolicy="no-referrer"
            className="w-full max-h-44 object-cover rounded-xl border border-border"
          />
        )}

        {/* Info / fallback message */}
        {result?.message && (
          <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">{result.message}</p>
        )}

        {/* Candidates to confirm */}
        <div className="space-y-3">
          {candidates.map((c, index) => {
            const CatIcon = categoryConfig[c.category].icon
            return (
              <div key={index} className="rounded-xl border border-border p-3 space-y-2.5">
                <Input
                  value={c.placeName}
                  onChange={(e) => updateCandidate(index, { placeName: e.target.value })}
                  placeholder="Place name"
                  className="font-medium"
                />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {c.countryCode ? `${getFlagEmoji(c.countryCode)} ` : ''}
                    {c.locationName}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={c.category}
                    onValueChange={(v) => updateCandidate(index, { category: v as PlaceCategory })}
                  >
                    <SelectTrigger className="h-9 w-32">
                      <span className="flex items-center gap-1.5">
                        <CatIcon className="h-3.5 w-3.5" />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_ORDER.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryConfig[cat].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleSaveCandidate(index)}
                    disabled={savingIndex === index}
                    className="ml-auto gap-1.5"
                    variant="coral"
                    size="sm"
                  >
                    {savingIndex === index ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Manual search (always available — for fallback or adding extra spots) */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {candidates.length === 0 ? 'Search for the place' : 'Add another place'}
          </p>
          <div className="flex gap-2">
            <Input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  runManualSearch()
                }
              }}
              placeholder="e.g. Time Out Market, Lisbon"
            />
            <Button onClick={runManualSearch} disabled={searching} variant="secondary" size="icon" className="shrink-0">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1.5">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => addFromSearch(r)}
                  className="w-full text-left flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/60 transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">
                    {r.address?.country_code ? `${getFlagEmoji(r.address.country_code.toUpperCase())} ` : ''}
                    {r.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
