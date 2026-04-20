'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Calendar,
  MapPin,
  Camera,
  X,
  SlidersHorizontal,
  Lock,
  Globe as GlobeIcon,
  Users,
  Sparkles
} from 'lucide-react'
import type { SearchFilters as SearchFiltersType } from './useSearchState'

interface SearchFiltersProps {
  filters: SearchFiltersType
  updateFilter: (key: keyof SearchFiltersType, value: unknown) => void
  removeLocationFilter: (location: string) => void
  clearFilters: () => void
}

export function SearchFiltersPanel({ filters, updateFilter, removeLocationFilter, clearFilters }: SearchFiltersProps) {
  return (
    <>
      {/* Search Input */}
      <Card className="border-none shadow-md">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-400" />
            <Input
              type="text"
              placeholder="Search adventures, places, travelers..."
              value={filters.query}
              onChange={(e) => updateFilter('query', e.target.value)}
              className="pl-11 pr-10 h-12 text-base"
            />
            {filters.query && (
              <button
                onClick={() => updateFilter('query', '')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card className="border-none shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <SlidersHorizontal className="h-4 w-4 text-stone-600" />
            <h3 className="font-medium text-stone-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Content Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Content Type</label>
              <Select
                value={filters.contentType}
                onValueChange={(value) => updateFilter('contentType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>All</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="albums">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      <span>Albums</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="travelers">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Travelers</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Sort By</label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>Relevance</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="date-desc">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Newest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="date-asc">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Oldest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visibility Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Visibility</label>
              <Select
                value={filters.visibility}
                onValueChange={(value) => updateFilter('visibility', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      <span>All</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friends">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Friends</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range From */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">From Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  type="date"
                  value={filters.dateRange.from || ''}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, from: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range To */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">To Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  type="date"
                  value={filters.dateRange.to || ''}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, to: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.dateRange.from || filters.dateRange.to || filters.locations.length > 0 || filters.visibility !== 'public' || filters.sortBy !== 'relevance') && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-600">Active filters:</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-olive-600 hover:text-olive-700 hover:bg-olive-50"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.dateRange.from && (
                  <Badge variant="secondary" className="gap-1">
                    From: {new Date(filters.dateRange.from).toLocaleDateString()}
                    <button
                      onClick={() => updateFilter('dateRange', { ...filters.dateRange, from: undefined })}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.dateRange.to && (
                  <Badge variant="secondary" className="gap-1">
                    To: {new Date(filters.dateRange.to).toLocaleDateString()}
                    <button
                      onClick={() => updateFilter('dateRange', { ...filters.dateRange, to: undefined })}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.locations.map(location => (
                  <Badge key={location} variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {location}
                    <button
                      onClick={() => removeLocationFilter(location)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {filters.visibility !== 'public' && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    {filters.visibility === 'all' ? <Sparkles className="h-3 w-3" /> :
                     filters.visibility === 'private' ? <Lock className="h-3 w-3" /> :
                     <Users className="h-3 w-3" />}
                    {filters.visibility}
                  </Badge>
                )}
                {filters.sortBy !== 'relevance' && (
                  <Badge variant="secondary" className="gap-1 capitalize">
                    Sort: {filters.sortBy.replace('-', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
