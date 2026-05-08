'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { FollowButton } from '@/components/social/FollowButton'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Calendar,
  MapPin,
  Camera,
  Lock,
  Globe as GlobeIcon,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { getPhotoUrl } from '@/lib/utils/photo-url'
import Link from 'next/link'
import type { SearchResult, SearchFilters } from './useSearchState'

interface SearchResultsProps {
  results: SearchResult[]
  filters: SearchFilters
  isSearching: boolean
  resultsRef: React.RefObject<HTMLDivElement | null>
  onResultSelect?: (result: SearchResult) => void
}

export function SearchResults({ results, filters, isSearching, resultsRef, onResultSelect }: SearchResultsProps) {
  return (
    <>
      {/* Results Summary - Simplified */}
      {results.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-stone-600">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
        </div>
      )}

      {/* Search Results */}
      <div ref={resultsRef}>
        {/* Results Heading */}
        {!isSearching && results.length > 0 && !filters.query && (
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-stone-900 mb-2">
              {filters.contentType === 'travelers' ? 'Discover Travelers' :
               filters.contentType === 'albums' ? 'Discover Albums' :
               'Discover Adventures'}
            </h2>
            <p className="text-stone-600">
              {filters.contentType === 'travelers' ? 'Connect with top travelers from around the world' :
               filters.contentType === 'albums' ? 'Explore popular travel albums' :
               'Explore popular albums and connect with top travelers'}
            </p>
          </div>
        )}

        {isSearching ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
              <p className="text-stone-600">{filters.query ? 'Searching...' : 'Loading travelers...'}</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center text-stone-500">
                <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {filters.query ? 'No results found' : 'No travelers found'}
                </p>
                <p className="text-sm">
                  {filters.query
                    ? 'Try adjusting your search terms or filters'
                    : 'Start searching to discover adventures and travelers'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {!filters.query && results.length > 0 ? (
              // Show categorized results when no search query (Discover mode)
              <div className="space-y-8">
                {/* Popular Albums Section - Only show if not filtering for travelers only */}
                {(filters.contentType === 'all' || filters.contentType === 'albums') && results.filter(r => r.type === 'album').length > 0 && (
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-3 sm:mb-4 px-2">
                      🌍 Popular Albums
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                      {results.filter(r => r.type === 'album').map((result) => (
                        <SearchResultCard
                          key={`${result.type}-${result.id}`}
                          result={result}
                          onSelect={onResultSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Travelers Section - Only show if not filtering for albums only */}
                {(filters.contentType === 'all' || filters.contentType === 'travelers') && results.filter(r => r.type === 'user').length > 0 && (
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-stone-900 mb-3 sm:mb-4 px-2">
                      👥 Top Travelers
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                      {results.filter(r => r.type === 'user').map((result) => (
                        <SearchResultCard
                          key={`${result.type}-${result.id}`}
                          result={result}
                          onSelect={onResultSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Regular search results (mixed)
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                {results.map((result) => (
                  <SearchResultCard
                    key={`${result.type}-${result.id}`}
                    result={result}
                    onSelect={onResultSelect}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

interface SearchResultCardProps {
  result: SearchResult
  onSelect?: (result: SearchResult) => void
}

function SearchResultCard({ result }: SearchResultCardProps) {
  const { user } = useAuth()
  const isOwnContent = user?.id === result.userId
  const getVisibilityIcon = () => {
    // For users, show their privacy level
    if (result.type === 'user') {
      switch (result.privacyLevel) {
        case 'public':
          return <GlobeIcon className="h-3 w-3" />
        case 'private':
          return <Lock className="h-3 w-3" />
        case 'friends':
          return <Users className="h-3 w-3" />
        default:
          return <GlobeIcon className="h-3 w-3" />
      }
    }

    // For albums, show album visibility
    switch (result.visibility) {
      case 'public':
        return <GlobeIcon className="h-3 w-3" />
      case 'private':
        return <Lock className="h-3 w-3" />
      case 'friends':
        return <Users className="h-3 w-3" />
    }
  }

  const getVisibilityColor = () => {
    const level = result.type === 'user' ? result.privacyLevel : result.visibility
    switch (level) {
      case 'public':
        return 'bg-green-100 text-green-700'
      case 'private':
        return 'bg-stone-100 text-stone-700'
      case 'friends':
        return 'bg-olive-100 text-olive-700'
      default:
        return 'bg-green-100 text-green-700'
    }
  }

  const getVisibilityLabel = () => {
    if (result.type === 'user') {
      return result.privacyLevel || 'public'
    }
    return result.visibility
  }

  const linkHref = result.type === 'user' ? `/profile/${result.userId}` : `/albums/${result.id}`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className="overflow-hidden border-2 border-stone-100 hover:border-olive-300 hover:shadow-xl transition-all duration-300">
        <Link href={linkHref} className="block">
          {/* Cover Image */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-stone-100 to-stone-200 overflow-hidden cursor-pointer">
            {result.imageUrl && result.visibility === 'public' ? (
              <Image
                src={getPhotoUrl(result.imageUrl) || ''}
                alt={result.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="h-16 w-16 text-stone-300" />
              </div>
            )}

            {/* Overlay badges */}
            <div className="absolute top-3 right-3 flex gap-2">
              <Badge className={cn("gap-1", getVisibilityColor())}>
                {getVisibilityIcon()}
                <span className="capitalize text-xs">{getVisibilityLabel()}</span>
              </Badge>
              {result.type === 'user' && (
                <Badge className="bg-olive-100 text-olive-700">
                  <Users className="h-3 w-3 mr-1" />
                  User
                </Badge>
              )}
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

            {/* Location badge at bottom */}
            {result.location && (
              <div className="absolute bottom-3 left-3 right-3">
                <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm gap-1 max-w-full">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{result.location}</span>
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-4 space-y-2">
            <div>
              <h3 className="font-semibold text-stone-900 line-clamp-1 text-lg group-hover:text-olive-600 transition-colors">
                {result.title}
              </h3>
              {result.description && (
                <p className="text-sm text-stone-600 line-clamp-2 mt-1">
                  {result.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-1">
                {result.type === 'user' ? (
                  <span className="font-medium">@{result.username}</span>
                ) : (
                  <span>@{result.username}</span>
                )}
              </div>
              {result.type === 'album' && result.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(result.date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Link>

        {/* Follow Button for Users - Outside Link to allow clicking */}
        {result.type === 'user' && !isOwnContent && (
          <CardContent className="pt-0 pb-4 px-4">
            <FollowButton
              userId={result.userId}
              size="sm"
              showText={true}
              className="w-full"
            />
          </CardContent>
        )}
      </Card>
    </motion.div>
  )
}
