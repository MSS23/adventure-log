'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  Star,
  Navigation,
  Plane,
  Clock,
  Edit,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useLocationFavorites } from '@/lib/hooks/useFavorites'
import { LocationFavoriteButton } from '@/components/ui/favorite-button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

interface WishlistLocation {
  id: string
  name: string
  country: string
  description?: string
  imageUrl?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  priority: 'low' | 'medium' | 'high' | 'urgent'
  plannedDate?: string
  estimatedCost?: number
  tags: string[]
  notes?: string
  visited: boolean
  dateAdded: string
}

// Mock data - in a real app this would come from your database
const mockWishlistLocations: WishlistLocation[] = [
  {
    id: '1',
    name: 'Santorini',
    country: 'Greece',
    description: 'Beautiful Greek island with stunning sunsets and white-washed buildings',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    coordinates: { latitude: 36.3932, longitude: 25.4615 },
    priority: 'high',
    plannedDate: '2024-06-15',
    estimatedCost: 2500,
    tags: ['beaches', 'sunset', 'romantic', 'mediterranean'],
    notes: 'Perfect for honeymoon trip',
    visited: false,
    dateAdded: '2024-01-15'
  },
  {
    id: '2',
    name: 'Machu Picchu',
    country: 'Peru',
    description: 'Ancient Incan city high in the Andes mountains',
    imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=800&q=80',
    coordinates: { latitude: -13.1631, longitude: -72.5450 },
    priority: 'urgent',
    plannedDate: '2024-09-10',
    estimatedCost: 3200,
    tags: ['hiking', 'history', 'adventure', 'mountains'],
    notes: 'Need to book train tickets in advance',
    visited: false,
    dateAdded: '2024-02-03'
  },
  {
    id: '3',
    name: 'Tokyo',
    country: 'Japan',
    description: 'Vibrant metropolis blending traditional and modern culture',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
    coordinates: { latitude: 35.6762, longitude: 139.6503 },
    priority: 'medium',
    plannedDate: '2024-11-20',
    estimatedCost: 4000,
    tags: ['city', 'culture', 'food', 'technology'],
    notes: 'Cherry blossom season or autumn colors',
    visited: false,
    dateAdded: '2024-01-20'
  },
  {
    id: '4',
    name: 'Bali',
    country: 'Indonesia',
    description: 'Tropical paradise with temples, rice terraces, and beaches',
    imageUrl: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80',
    coordinates: { latitude: -8.3405, longitude: 115.0920 },
    priority: 'low',
    estimatedCost: 1800,
    tags: ['beaches', 'temples', 'relaxation', 'tropical'],
    notes: 'Good for digital nomad lifestyle',
    visited: true,
    dateAdded: '2023-12-10'
  }
]

type ViewMode = 'grid' | 'list'
type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent'
type SortOption = 'dateAdded' | 'priority' | 'plannedDate' | 'name' | 'cost'

export function LocationWishlist() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [showVisited, setShowVisited] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<WishlistLocation | null>(null)

  // For real implementation, you'd use the actual favorites hook
  // const { locationFavorites } = useLocationFavorites()

  // Filter and sort locations
  const filteredLocations = mockWishlistLocations
    .filter(location => {
      const matchesSearch = searchQuery === '' ||
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesPriority = filterPriority === 'all' || location.priority === filterPriority
      const matchesVisited = showVisited || !location.visited

      return matchesSearch && matchesPriority && matchesVisited
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'dateAdded':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
        case 'plannedDate':
          if (!a.plannedDate && !b.plannedDate) return 0
          if (!a.plannedDate) return 1
          if (!b.plannedDate) return -1
          return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        case 'cost':
          return (b.estimatedCost || 0) - (a.estimatedCost || 0)
        default:
          return 0
      }
    })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Star className="h-7 w-7 text-yellow-600" />
            Travel Wishlist
          </h2>
          <p className="text-gray-600 mt-1">
            Plan your future adventures and dream destinations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Destination
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Destination</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <p className="text-gray-600">Feature coming soon!</p>
                <p className="text-sm text-gray-500 mt-2">
                  You&apos;ll be able to add destinations, set priorities, plan dates, and track costs.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {mockWishlistLocations.length}
              </div>
              <div className="text-sm text-gray-600">Total Destinations</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {mockWishlistLocations.filter(l => l.visited).length}
              </div>
              <div className="text-sm text-gray-600">Visited</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {mockWishlistLocations.filter(l => l.priority === 'urgent' || l.priority === 'high').length}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(mockWishlistLocations.reduce((sum, l) => sum + (l.estimatedCost || 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Total Budget</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search destinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as FilterPriority)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="priority">Sort by Priority</option>
            <option value="dateAdded">Date Added</option>
            <option value="plannedDate">Planned Date</option>
            <option value="name">Name</option>
            <option value="cost">Cost</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVisited(!showVisited)}
            className={showVisited ? 'bg-green-50 border-green-300' : ''}
          >
            {showVisited ? 'Hide Visited' : 'Show Visited'}
          </Button>
        </div>
      </div>

      {/* Locations Grid/List */}
      <AnimatePresence>
        <div className={cn(
          'gap-6',
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
        )}>
          {filteredLocations.map((location, index) => (
            <motion.div
              key={location.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className={cn(
                'group hover:shadow-lg transition-all duration-300 cursor-pointer',
                location.visited && 'opacity-75',
                viewMode === 'list' && 'flex flex-row'
              )}>
                {/* Image */}
                {location.imageUrl && (
                  <div className={cn(
                    'relative overflow-hidden bg-gray-100',
                    viewMode === 'grid' ? 'aspect-video' : 'w-32 h-32 flex-shrink-0'
                  )}>
                    <Image
                      src={location.imageUrl}
                      alt={location.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Priority badge */}
                    <Badge className={cn(
                      'absolute top-2 left-2 text-xs border',
                      getPriorityColor(location.priority)
                    )}>
                      {location.priority.toUpperCase()}
                    </Badge>

                    {/* Visited overlay */}
                    {location.visited && (
                      <div className="absolute inset-0 bg-green-600/20 flex items-center justify-center">
                        <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Visited ✓
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <CardContent className={cn(
                  'p-4 flex-1',
                  !location.imageUrl && 'pt-6'
                )}>
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {location.name}
                        </h3>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location.country}
                        </p>
                      </div>

                      <LocationFavoriteButton
                        targetId={location.id}
                        className="opacity-70 group-hover:opacity-100"
                      />
                    </div>

                    {/* Description */}
                    {location.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {location.description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="space-y-2">
                      {location.plannedDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>Planned: {formatDate(location.plannedDate)}</span>
                        </div>
                      )}

                      {location.estimatedCost && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-green-600 font-medium">
                            {formatCurrency(location.estimatedCost)}
                          </span>
                          <span>estimated</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {location.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {location.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {location.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{location.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-xs text-gray-500">
                        Added {formatDate(location.dateAdded)}
                      </div>

                      <div className="flex items-center gap-1">
                        {location.coordinates && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Navigation className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Empty State */}
      {filteredLocations.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery || filterPriority !== 'all' ? 'No matching destinations' : 'Your wishlist is empty'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterPriority !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start planning your dream adventures by adding destinations to your wishlist!'
                }
              </p>
              {!searchQuery && filterPriority === 'all' && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Destination
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}