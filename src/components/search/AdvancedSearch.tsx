'use client'

import { cn } from '@/lib/utils'
import { useSearchState } from './useSearchState'
import { SearchFiltersPanel } from './SearchFilters'
import { SearchResults } from './SearchResults'
import type { SearchResult } from './useSearchState'

interface AdvancedSearchProps {
  onResultSelect?: (result: SearchResult) => void
  onWeatherLocationDetected?: (lat: number, lng: number, name: string) => void
  initialQuery?: string
  className?: string
}

export function AdvancedSearch({ onResultSelect, onWeatherLocationDetected, initialQuery = '', className }: AdvancedSearchProps) {
  const {
    filters,
    results,
    isSearching,
    resultsRef,
    updateFilter,
    removeLocationFilter,
    clearFilters,
  } = useSearchState({ initialQuery, onWeatherLocationDetected })

  return (
    <div className={cn("space-y-6", className)}>
      <SearchFiltersPanel
        filters={filters}
        updateFilter={updateFilter}
        removeLocationFilter={removeLocationFilter}
        clearFilters={clearFilters}
      />

      <SearchResults
        results={results}
        filters={filters}
        isSearching={isSearching}
        resultsRef={resultsRef}
        onResultSelect={onResultSelect}
      />
    </div>
  )
}
