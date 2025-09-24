'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart,
  Camera,
  MapPin,
  Calendar,
  Search,
  Grid3X3,
  List,
  Trash2,
  Eye,
  Download
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { CompactFavoriteButton } from '@/components/ui/favorite-button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | 'photo' | 'album' | 'location'

export default function FavoritesPage() {
  const {
    favorites,
    loading,
    error,
    photoFavorites,
    albumFavorites,
    locationFavorites,
    removeFavorite
  } = useFavorites()

  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // Filter favorites based on search and type
  const filteredFavorites = favorites.filter(favorite => {
    const matchesSearch = searchQuery === '' ||
      favorite.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      favorite.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      favorite.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = filterType === 'all' || favorite.target_type === filterType

    return matchesSearch && matchesType
  })

  const handleRemoveSelected = async () => {
    try {
      await Promise.all(
        selectedItems.map(itemId => {
          const favorite = favorites.find(fav => fav.id === itemId)
          if (favorite) {
            return removeFavorite(favorite.target_id, favorite.target_type)
          }
        })
      )
      setSelectedItems([])
    } catch (error) {
      console.error('Failed to remove favorites:', error)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Camera className="h-4 w-4" />
      case 'album': return <Grid3X3 className="h-4 w-4" />
      case 'location': return <MapPin className="h-4 w-4" />
      default: return <Heart className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'photo': return 'bg-blue-100 text-blue-800'
      case 'album': return 'bg-green-100 text-green-800'
      case 'location': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <h2 className="text-xl font-semibold mt-4">Loading your favorites...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-600" />
            Your Favorites
          </h1>
          <p className="text-gray-600 mt-2">
            All your favorite photos, albums, and locations in one place
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <Button
              variant="outline"
              onClick={handleRemoveSelected}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove Selected ({selectedItems.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{favorites.length}</div>
              <div className="text-sm text-gray-600 mt-1">Total Favorites</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{photoFavorites.length}</div>
              <div className="text-sm text-gray-600 mt-1">Photos</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{albumFavorites.length}</div>
              <div className="text-sm text-gray-600 mt-1">Albums</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{locationFavorites.length}</div>
              <div className="text-sm text-gray-600 mt-1">Locations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search favorites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="photo">Photos</TabsTrigger>
            <TabsTrigger value="album">Albums</TabsTrigger>
            <TabsTrigger value="location">Places</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p className="font-medium">Failed to load favorites</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredFavorites.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery || filterType !== 'all' ? 'No matching favorites' : 'No favorites yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start exploring and add some photos, albums, or locations to your favorites!'
                }
              </p>
              {!searchQuery && filterType === 'all' && (
                <Link href="/dashboard">
                  <Button>
                    Explore Adventures
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorites Grid/List */}
      {filteredFavorites.length > 0 && (
        <AnimatePresence>
          <div className={cn(
            'gap-6',
            viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
          )}>
            {filteredFavorites.map((favorite, index) => (
              <motion.div
                key={favorite.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={cn(
                  'group hover:shadow-lg transition-all duration-300',
                  selectedItems.includes(favorite.id) && 'ring-2 ring-blue-500',
                  viewMode === 'list' && 'flex flex-row'
                )}>
                  {/* Image/Thumbnail */}
                  {favorite.metadata?.photo_url && (
                    <div className={cn(
                      'relative overflow-hidden bg-gray-100',
                      viewMode === 'grid' ? 'aspect-video' : 'w-24 h-24 flex-shrink-0'
                    )}>
                      <Image
                        src={favorite.metadata.photo_url}
                        alt={favorite.metadata.title || 'Favorite item'}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {/* Selection overlay */}
                      <button
                        onClick={() => toggleItemSelection(favorite.id)}
                        className="absolute top-2 left-2 w-6 h-6 rounded-full border-2 border-white bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center"
                      >
                        {selectedItems.includes(favorite.id) && (
                          <div className="w-3 h-3 rounded-full bg-blue-600" />
                        )}
                      </button>

                      {/* Type badge */}
                      <Badge className={cn(
                        'absolute top-2 right-2 text-xs',
                        getTypeColor(favorite.target_type)
                      )}>
                        {getTypeIcon(favorite.target_type)}
                        <span className="ml-1 capitalize">{favorite.target_type}</span>
                      </Badge>
                    </div>
                  )}

                  <div className={cn(
                    'p-4 flex-1',
                    !favorite.metadata?.photo_url && 'pt-6'
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {favorite.metadata?.title || `${favorite.target_type} ${favorite.target_id.slice(0, 8)}`}
                        </h3>

                        {favorite.metadata?.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {favorite.metadata.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Added {formatDate(favorite.created_at)}
                          </span>
                        </div>

                        {/* Tags */}
                        {favorite.metadata?.tags && favorite.metadata.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {favorite.metadata.tags.slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {favorite.metadata.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{favorite.metadata.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-2">
                        <CompactFavoriteButton
                          targetId={favorite.target_id}
                          targetType={favorite.target_type}
                          className="opacity-70 group-hover:opacity-100"
                        />
                      </div>
                    </div>

                    {/* Bottom actions for list view */}
                    {viewMode === 'list' && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          {favorite.target_type === 'photo' && (
                            <Button variant="ghost" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}