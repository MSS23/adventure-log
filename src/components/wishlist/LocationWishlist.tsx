'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Plus,
  Search,
  Grid3X3,
  List,
  Calendar,
  Star,
  Navigation,
  Edit,
  Trash2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LocationFavoriteButton } from '@/components/ui/favorite-button'
import { cn } from '@/lib/utils'
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

// Real wishlist data will come from the database
const wishlistLocations: WishlistLocation[] = []

type ViewMode = 'grid' | 'list'
type FilterPriority = 'all' | 'low' | 'medium' | 'high' | 'urgent'
type SortOption = 'dateAdded' | 'priority' | 'plannedDate' | 'name' | 'cost'

export function LocationWishlist() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('all')
  const [sortBy, setSortBy] = useState<SortOption>('priority')
  const [showVisited, setShowVisited] = useState(false)

  // For real implementation, you'd use the actual favorites hook
  // const { locationFavorites } = useLocationFavorites()

  // Filter and sort locations
  const filteredLocations = wishlistLocations
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
      case 'urgent': return 'bg-destructive/10 text-destructive border-destructive/20'
      case 'high': return 'bg-accent/10 text-accent border-accent/20'
      case 'medium': return 'bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold)] border-[color:var(--color-gold)]/25'
      case 'low': return 'bg-muted text-muted-foreground border-border'
      default: return 'bg-muted text-muted-foreground border-border'
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
          <h2 className="al-display text-xl md:text-2xl flex items-center gap-3">
            <Star className="h-6 w-6 text-accent" />
            Travel Wishlist
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
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
                <p className="text-foreground">Feature coming soon!</p>
                <p className="text-sm text-muted-foreground mt-2">
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
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="al-eyebrow">Total Destinations</p>
          <p className="al-stat-value text-2xl md:text-3xl mt-1">
            {wishlistLocations.length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="al-eyebrow">Visited</p>
          <p className="al-stat-value text-2xl md:text-3xl mt-1">
            {wishlistLocations.filter(l => l.visited).length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="al-eyebrow">High Priority</p>
          <p className="al-stat-value text-2xl md:text-3xl mt-1">
            {wishlistLocations.filter(l => l.priority === 'urgent' || l.priority === 'high').length}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="al-eyebrow">Total Budget</p>
          <p className="al-stat-value text-2xl md:text-3xl mt-1">
            {formatCurrency(wishlistLocations.reduce((sum, l) => sum + (l.estimatedCost || 0), 0))}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground"
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
            className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground"
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
            className={showVisited ? 'bg-primary/10 border-primary/30 text-primary' : ''}
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
                'group transition-all duration-200 hover:border-primary/30 hover:shadow-md cursor-pointer overflow-hidden',
                location.visited && 'opacity-75',
                viewMode === 'list' && 'flex flex-row'
              )}>
                {/* Image */}
                {location.imageUrl && (
                  <div className={cn(
                    'relative overflow-hidden bg-muted',
                    viewMode === 'grid' ? 'aspect-video' : 'w-32 h-32 flex-shrink-0'
                  )}>
                    <Image
                      src={location.imageUrl}
                      alt={location.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />

                    {/* Priority badge */}
                    <Badge className={cn(
                      'absolute top-2 left-2 text-xs border rounded-full',
                      getPriorityColor(location.priority)
                    )}>
                      {location.priority.toUpperCase()}
                    </Badge>

                    {/* Visited overlay */}
                    {location.visited && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
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
                        <h3 className="font-heading font-semibold text-foreground truncate">
                          {location.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
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
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {location.description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="space-y-2">
                      {location.plannedDate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Planned: {formatDate(location.plannedDate)}</span>
                        </div>
                      )}

                      {location.estimatedCost && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-primary font-medium">
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
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
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
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <Star className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            {searchQuery || filterPriority !== 'all' ? 'No matching destinations' : 'Your wishlist is empty'}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {searchQuery || filterPriority !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start planning your dream adventures by adding destinations to your wishlist!'
            }
          </p>
          {!searchQuery && filterPriority === 'all' && (
            <div className="mt-5">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add First Destination
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}