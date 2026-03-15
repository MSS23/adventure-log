'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'
import { useWishlist, type WishlistItem } from '@/lib/hooks/useWishlist'
import { type LocationData } from '@/lib/utils/locationUtils'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Star,
  Plus,
  X,
  Check,
  Trash2,
  MapPin,
  Send,
  Loader2,
  Sparkles,
  Calendar,
  Users,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react'

type FilterTab = 'all' | 'high' | 'completed'
type Priority = 'low' | 'medium' | 'high'

const priorityConfig: Record<Priority, { label: string; color: string; dot: string }> = {
  low: {
    label: 'Low',
    color: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
    dot: 'bg-stone-400',
  },
  medium: {
    label: 'Medium',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    dot: 'bg-amber-400',
  },
  high: {
    label: 'High',
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    dot: 'bg-rose-400',
  },
}

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

export default function WishlistPage() {
  const { user } = useAuth()
  const {
    items,
    loading,
    addItem,
    removeItem,
    updateItem,
    markCompleted,
    suggestToPartner,
    travelPartners,
    loadPartnerWishlist,
    partnerWishlists,
  } = useWishlist()

  const [showAddForm, setShowAddForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [location, setLocation] = useState<LocationData | null>(null)
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [isAdding, setIsAdding] = useState(false)

  // Travel partners state
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null)
  const [suggestingTo, setSuggestingTo] = useState<string | null>(null)
  const [suggestLocation, setSuggestLocation] = useState<LocationData | null>(null)
  const [suggestNote, setSuggestNote] = useState('')
  const [isSuggesting, setIsSuggesting] = useState(false)

  // Filter items
  const filteredItems = useMemo(() => {
    if (!items) return []
    switch (activeFilter) {
      case 'high':
        return items.filter((item) => item.priority === 'high' && !item.completed_at)
      case 'completed':
        return items.filter((item) => item.completed_at)
      default:
        return items.filter((item) => !item.completed_at)
    }
  }, [items, activeFilter])

  // Counts for filter badges
  const counts = useMemo(() => {
    if (!items) return { all: 0, high: 0, completed: 0 }
    return {
      all: items.filter((i) => !i.completed_at).length,
      high: items.filter((i) => i.priority === 'high' && !i.completed_at).length,
      completed: items.filter((i) => i.completed_at).length,
    }
  }, [items])

  const handleAddItem = async () => {
    if (!location) return
    setIsAdding(true)
    try {
      await addItem({
        location_name: location.display_name,
        latitude: location.latitude,
        longitude: location.longitude,
        country_code: location.country_code,
        notes: notes.trim() || undefined,
        priority,
      })
      toast.success('Destination added to your wishlist!')
      setLocation(null)
      setNotes('')
      setPriority('medium')
      setShowAddForm(false)
    } catch {
      toast.error('Failed to add destination')
    } finally {
      setIsAdding(false)
    }
  }

  const handleMarkCompleted = async (itemId: string) => {
    try {
      await markCompleted(itemId)
      toast.success('Destination marked as visited!')
    } catch {
      toast.error('Something went wrong')
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId)
      toast.success('Removed from wishlist')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const handleExpandPartner = async (partnerId: string) => {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null)
      return
    }
    setExpandedPartner(partnerId)
    await loadPartnerWishlist(partnerId)
  }

  const handleSuggest = async (partnerId: string) => {
    if (!suggestLocation) return
    setIsSuggesting(true)
    try {
      const partner = travelPartners?.find((p) => p.id === partnerId)
      await suggestToPartner(partnerId, {
        location_name: suggestLocation.display_name,
        latitude: suggestLocation.latitude,
        longitude: suggestLocation.longitude,
        country_code: suggestLocation.country_code,
        notes: suggestNote.trim() || undefined,
      })
      toast.success(`Suggested to @${partner?.username || 'partner'}!`)
      setSuggestingTo(null)
      setSuggestLocation(null)
      setSuggestNote('')
    } catch {
      toast.error('Failed to send suggestion')
    } finally {
      setIsSuggesting(false)
    }
  }

  if (!user) return null

  const totalBucketList = items?.filter((i) => !i.completed_at).length ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-olive-50/30 dark:from-stone-950 dark:via-stone-950 dark:to-stone-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
        {/* ── Header ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-olive-100 to-olive-200/60 dark:from-olive-900/40 dark:to-olive-800/20">
                  <Star className="h-6 w-6 text-olive-600 dark:text-olive-400" />
                </div>
                <h1 className="text-3xl font-heading font-bold text-stone-900 dark:text-white">
                  Travel Wishlist
                </h1>
              </div>
              <p className="text-stone-500 dark:text-stone-400 ml-[52px]">
                {totalBucketList} destination{totalBucketList !== 1 ? 's' : ''} on your bucket list
              </p>
            </div>

            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className={cn(
                'gap-2 shrink-0',
                showAddForm
                  ? 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-700'
                  : 'bg-gradient-to-r from-olive-600 to-olive-700 hover:from-olive-700 hover:to-olive-800 text-white shadow-lg shadow-olive-500/20'
              )}
            >
              {showAddForm ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Destination
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* ── Add Destination Form ──────────────────────────────── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <GlassCard variant="featured" padding="lg">
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-olive-700 dark:text-olive-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold uppercase tracking-wider">
                      New Destination
                    </span>
                  </div>

                  {/* Location Search */}
                  <LocationSearchInput
                    value={location}
                    onChange={setLocation}
                    placeholder="Search for a destination..."
                    label="Where do you want to go?"
                  />

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-olive-500" />
                      Notes (optional)
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Why do you want to visit? Any must-see spots..."
                      className="rounded-xl dark:bg-[#1A1A1A] dark:border-white/[0.1] resize-none min-h-[80px]"
                    />
                  </div>

                  {/* Priority Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                      Priority
                    </label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border',
                            priority === p
                              ? 'bg-olive-50 dark:bg-olive-900/30 text-olive-700 dark:text-olive-400 border-olive-200 dark:border-olive-700 shadow-sm'
                              : 'bg-white dark:bg-[#1A1A1A] text-stone-600 dark:text-stone-400 border-stone-200 dark:border-white/[0.1] hover:border-stone-300 dark:hover:border-stone-600'
                          )}
                        >
                          <span
                            className={cn('w-2 h-2 rounded-full', priorityConfig[p].dot)}
                          />
                          {priorityConfig[p].label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleAddItem}
                    disabled={!location || isAdding}
                    className="w-full gap-2 bg-gradient-to-r from-olive-600 to-olive-700 hover:from-olive-700 hover:to-olive-800 text-white shadow-lg shadow-olive-500/20"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add to Wishlist
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filter Tabs ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 flex-wrap"
        >
          {([
            { key: 'all' as FilterTab, label: 'All' },
            { key: 'high' as FilterTab, label: 'High Priority' },
            { key: 'completed' as FilterTab, label: 'Completed' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all border',
                activeFilter === key
                  ? 'bg-olive-600 text-white border-olive-600 shadow-md shadow-olive-500/20'
                  : 'bg-white dark:bg-[#111111] text-stone-600 dark:text-stone-400 border-stone-200 dark:border-white/[0.1] hover:bg-olive-50 dark:hover:bg-[#1A1A1A]'
              )}
            >
              {label}
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 text-xs rounded-full inline-block',
                  activeFilter === key
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                )}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </motion.div>

        {/* ── Wishlist Grid ─────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-olive-500" />
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex p-4 rounded-2xl bg-olive-50 dark:bg-olive-900/20 mb-4">
              <MapPin className="h-8 w-8 text-olive-400" />
            </div>
            <p className="text-stone-500 dark:text-stone-400 text-lg">
              {activeFilter === 'completed'
                ? 'No completed destinations yet'
                : activeFilter === 'high'
                  ? 'No high priority destinations'
                  : 'Your wishlist is empty'}
            </p>
            {activeFilter === 'all' && (
              <p className="text-stone-400 dark:text-stone-500 text-sm mt-1">
                Add your first dream destination to get started
              </p>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 24,
                    delay: index * 0.06,
                  }}
                >
                  <GlassCard
                    variant={item.completed_at ? 'solid' : 'default'}
                    hover={item.completed_at ? 'none' : 'lift'}
                    padding="none"
                    className={cn(
                      'group relative',
                      item.completed_at && 'opacity-60'
                    )}
                  >
                    <div className="p-5">
                      {/* Top row: location + priority */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.country_code && (
                              <span className="text-lg leading-none">
                                {countryCodeToFlag(item.country_code)}
                              </span>
                            )}
                            <h3
                              className={cn(
                                'font-semibold text-stone-900 dark:text-white truncate',
                                item.completed_at && 'line-through text-stone-500 dark:text-stone-500'
                              )}
                            >
                              {item.location_name}
                            </h3>
                          </div>
                          {item.notes && (
                            <p
                              className={cn(
                                'text-sm text-stone-500 dark:text-stone-400 line-clamp-2 mt-1',
                                item.completed_at && 'line-through'
                              )}
                            >
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5',
                            priorityConfig[(item.priority as Priority) || 'medium']?.color
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              priorityConfig[(item.priority as Priority) || 'medium']?.dot
                            )}
                          />
                          {priorityConfig[(item.priority as Priority) || 'medium']?.label}
                        </span>
                      </div>

                      {/* Source badge */}
                      {item.source === 'shared' && item.shared_by?.username && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-olive-50 dark:bg-olive-900/20 text-olive-700 dark:text-olive-400 text-xs font-medium">
                            <ArrowUpRight className="h-3 w-3" />
                            Suggested by @{item.shared_by?.username}
                          </span>
                        </div>
                      )}

                      {/* Bottom: date + actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-white/[0.06]">
                        <span className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-1">
                          {!item.completed_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkCompleted(item.id)}
                              className="h-8 w-8 p-0 rounded-lg text-olive-600 dark:text-olive-400 hover:bg-olive-50 dark:hover:bg-olive-900/20"
                              title="Mark as visited"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                            className="h-8 w-8 p-0 rounded-lg text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Travel Partners Section ───────────────────────────── */}
        {travelPartners && travelPartners.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-5 pt-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-olive-100 to-olive-200/60 dark:from-olive-900/40 dark:to-olive-800/20">
                <Users className="h-5 w-5 text-olive-600 dark:text-olive-400" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-semibold text-stone-900 dark:text-white">
                  Travel Partners&apos; Wishlists
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  See where your friends want to go
                </p>
              </div>
            </div>

            {/* Partner Avatars */}
            <div className="flex gap-3 flex-wrap">
              {travelPartners.map((partner) => (
                <button
                  key={partner.id}
                  onClick={() => handleExpandPartner(partner.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all',
                    expandedPartner === partner.id
                      ? 'bg-olive-50 dark:bg-olive-900/20 ring-2 ring-olive-300 dark:ring-olive-700'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-800/50'
                  )}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-olive-200 dark:ring-olive-800 ring-offset-2 ring-offset-white dark:ring-offset-stone-950">
                    <AvatarImage src={partner.avatar_url || undefined} alt={partner.display_name || partner.username} />
                    <AvatarFallback className="bg-olive-100 dark:bg-olive-900 text-olive-700 dark:text-olive-300 text-sm font-semibold">
                      {(partner.display_name || partner.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-stone-600 dark:text-stone-400 max-w-[64px] truncate">
                    {partner.display_name || partner.username}
                  </span>
                </button>
              ))}
            </div>

            {/* Expanded Partner Wishlist */}
            <AnimatePresence>
              {expandedPartner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {(() => {
                    const partner = travelPartners.find(
                      (p) => p.id === expandedPartner
                    )
                    const wishlistItems = partnerWishlists?.get(expandedPartner)
                    if (!partner) return null

                    return (
                      <GlassCard variant="solid" padding="lg">
                        <div className="space-y-4">
                          {/* Partner header */}
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={partner.avatar_url || undefined}
                                  alt={partner.display_name || partner.username}
                                />
                                <AvatarFallback className="bg-olive-100 dark:bg-olive-900 text-olive-700 dark:text-olive-300 text-xs font-semibold">
                                  {(partner.display_name || partner.username || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-stone-900 dark:text-white text-sm">
                                  @{partner.username}
                                </p>
                                <p className="text-xs text-stone-400 dark:text-stone-500">
                                  {wishlistItems?.length ?? 0} destination{(wishlistItems?.length ?? 0) !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setSuggestingTo(
                                    suggestingTo === partner.id ? null : partner.id
                                  )
                                }
                                className="gap-1.5 text-sm"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Suggest a Destination
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedPartner(null)}
                                className="h-8 w-8 p-0 rounded-lg"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Suggest Destination Inline Form */}
                          <AnimatePresence>
                            {suggestingTo === partner.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 rounded-xl bg-olive-50/50 dark:bg-olive-900/10 border border-olive-200/50 dark:border-olive-800/30 space-y-3">
                                  <p className="text-sm font-medium text-olive-700 dark:text-olive-400">
                                    Suggest a destination to @{partner.username}
                                  </p>
                                  <LocationSearchInput
                                    value={suggestLocation}
                                    onChange={setSuggestLocation}
                                    placeholder="Search for a destination..."
                                    label="Destination"
                                  />
                                  <Textarea
                                    value={suggestNote}
                                    onChange={(e) => setSuggestNote(e.target.value)}
                                    placeholder="Add a note (optional)..."
                                    className="rounded-xl dark:bg-[#1A1A1A] dark:border-white/[0.1] resize-none min-h-[60px] text-sm"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSuggestingTo(null)
                                        setSuggestLocation(null)
                                        setSuggestNote('')
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={!suggestLocation || isSuggesting}
                                      onClick={() => handleSuggest(partner.id)}
                                      className="gap-1.5 bg-gradient-to-r from-olive-600 to-olive-700 hover:from-olive-700 hover:to-olive-800 text-white"
                                    >
                                      {isSuggesting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Send className="h-3.5 w-3.5" />
                                      )}
                                      Suggest
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Partner's wishlist items */}
                          {!wishlistItems ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin text-olive-500" />
                            </div>
                          ) : wishlistItems.length === 0 ? (
                            <p className="text-center py-6 text-sm text-stone-400 dark:text-stone-500">
                              No destinations on their wishlist yet
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {wishlistItems.map((item: WishlistItem, idx: number) => (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className={cn(
                                    'flex items-center justify-between p-3 rounded-xl border transition-colors',
                                    item.completed_at
                                      ? 'bg-stone-50 dark:bg-stone-900/50 border-stone-100 dark:border-white/[0.04] opacity-50'
                                      : 'bg-white dark:bg-[#111111] border-stone-200/50 dark:border-white/[0.08] hover:border-olive-200 dark:hover:border-olive-800/40'
                                  )}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {item.country_code && (
                                      <span className="text-base">
                                        {countryCodeToFlag(item.country_code)}
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <p
                                        className={cn(
                                          'text-sm font-medium text-stone-800 dark:text-stone-200 truncate',
                                          item.completed_at && 'line-through text-stone-400 dark:text-stone-600'
                                        )}
                                      >
                                        {item.location_name}
                                      </p>
                                      {item.notes && (
                                        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                                          {item.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      'shrink-0 px-2 py-0.5 rounded-md text-xs font-medium',
                                      item.completed_at
                                        ? 'bg-olive-50 dark:bg-olive-900/20 text-olive-600 dark:text-olive-400'
                                        : priorityConfig[(item.priority as Priority) || 'medium']?.color
                                    )}
                                  >
                                    {item.completed_at
                                      ? 'Visited'
                                      : priorityConfig[(item.priority as Priority) || 'medium']?.label}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    )
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
