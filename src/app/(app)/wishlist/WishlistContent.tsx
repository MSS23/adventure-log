'use client'

import { useState, useMemo, useCallback } from 'react'
import { useWishlist, type WishlistItem, type TravelPartner } from '@/lib/hooks/useWishlist'
import { type LocationData } from '@/lib/utils/locationUtils'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { WalkthroughTour, type TourStep } from '@/components/ui/walkthrough-tour'
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
  Filter,
  ListChecks,
  HelpCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import { PageHeader } from '@/components/layout/PageHeader'

type FilterTab = 'all' | 'high' | 'completed'
type Priority = 'low' | 'medium' | 'high'

const priorityConfig: Record<Priority, { label: string; color: string; dot: string }> = {
  low: {
    label: 'Low',
    color: 'bg-muted text-muted-foreground border border-border',
    dot: 'bg-muted-foreground/60',
  },
  medium: {
    // Slightly deeper tint + border so the gold text reads ≥4.5:1 in both
    // themes (light gold on ivory was the weak case at /15).
    label: 'Medium',
    color: 'bg-[color:var(--color-gold)]/20 text-[color:var(--color-gold)] border border-[color:var(--color-gold)]/35',
    dot: 'bg-[color:var(--color-gold)]',
  },
  high: {
    label: 'High',
    color: 'bg-accent/10 text-accent border border-accent/20',
    dot: 'bg-accent',
  },
}

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

interface WishlistContentProps {
  initialItems: WishlistItem[]
  initialPartners: TravelPartner[]
}

export default function WishlistContent({ initialItems, initialPartners }: WishlistContentProps) {
  const {
    items: hookItems,
    loading,
    addItem,
    removeItem,
    suggestToPartner,
    travelPartners: hookPartners,
    loadPartnerWishlist,
    partnerWishlists,
  } = useWishlist()

  // Use hook data once loaded, fall back to server-provided initial data
  const items = loading ? initialItems : hookItems
  const travelPartners = loading ? initialPartners : hookPartners

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

  const handleMarkCompleted = (itemId: string) => {
    // A wishlist item is only "completed" once an album exists for it.
    // Clicking the tick takes the user into the album-create flow with
    // the destination prefilled. Completion happens server-side when the
    // album is saved (see useAlbumCreation.ts → submitAlbum).
    const item = items.find((i) => i.id === itemId)
    if (!item) {
      toast.error('Could not find this destination')
      return
    }

    const params = new URLSearchParams({ location: item.location_name })
    if (item.country_code) params.set('country', item.country_code)
    if (typeof item.latitude === 'number') params.set('lat', String(item.latitude))
    if (typeof item.longitude === 'number') params.set('lng', String(item.longitude))
    if (item.notes) params.set('notes', item.notes)
    params.set('source', 'wishlist')
    params.set('wishlistItemId', item.id)

    toast.success(`Let's log your trip to ${item.location_name}!`)
    window.location.href = `/albums/new?${params.toString()}`
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

  // ── Tour Steps ─────────────────────────────────────────────
  const openAddFormForTour = useCallback(() => {
    setShowAddForm(true)
  }, [])

  const tourSteps: TourStep[] = useMemo(
    () => [
      {
        target: 'wishlist-header',
        title: 'Your Travel Wishlist',
        description:
          'This is your personal bucket list for destinations you dream of visiting. Track places, set priorities, and mark them as visited when you go!',
        icon: <Star className="h-5 w-5" />,
        placement: 'bottom' as const,
        spotlightPadding: 12,
      },
      {
        target: 'add-destination-btn',
        title: 'Add a Destination',
        description:
          'Tap this button to add a new destination. You can search for any city or country, add notes about why you want to visit, and set its priority level.',
        icon: <Plus className="h-5 w-5" />,
        placement: 'bottom' as const,
      },
      {
        target: 'add-destination-form',
        title: 'Search & Customize',
        description:
          'Search for any destination worldwide. Add personal notes about must-see spots, set priority (low, medium, high), then hit "Add to Wishlist" to save it.',
        icon: <Sparkles className="h-5 w-5" />,
        placement: 'bottom' as const,
        spotlightPadding: 12,
        beforeShow: openAddFormForTour,
      },
      {
        target: 'filter-tabs',
        title: 'Filter Your List',
        description:
          'Use these tabs to filter your destinations. View all active items, focus on high priority must-visits, or see places you\'ve already been to.',
        icon: <Filter className="h-5 w-5" />,
        placement: 'bottom' as const,
      },
      {
        target: 'wishlist-grid',
        title: 'Your Destinations',
        description:
          'Each card shows a destination with its flag, notes, and priority. Use the checkmark to mark it as visited, or the trash icon to remove it.',
        icon: <ListChecks className="h-5 w-5" />,
        placement: 'top' as const,
        spotlightPadding: 12,
      },
      ...(travelPartners && travelPartners.length > 0
        ? [
            {
              target: 'travel-partners',
              title: 'Travel Partners',
              description:
                'See wishlists from friends who follow you back. Tap a friend to view their bucket list, or suggest destinations to them!',
              icon: <Users className="h-5 w-5" />,
              placement: 'top' as const,
              spotlightPadding: 12,
            },
          ]
        : []),
    ],
    [travelPartners, openAddFormForTour]
  )

  const totalBucketList = items?.filter((i) => !i.completed_at).length ?? 0

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* ── Walkthrough Tour ───────────────────────────────── */}
      <WalkthroughTour
        tourId="wishlist-tour"
        steps={tourSteps}
        autoStart={true}
      >
        {(startTour) => (
          /* Hidden trigger — we use the help button instead */
          <button
            id="tour-restart-trigger"
            onClick={startTour}
            className="hidden"
            aria-hidden
          />
        )}
      </WalkthroughTour>

      <div className="space-y-8">
        {/* ── Header ────────────────────────────────────────────── */}
        <div data-tour-step="wishlist-header">
          <PageHeader
            eyebrow="Bucket list"
            title={<>Wishlist</>}
            icon={<Star className="h-7 w-7 text-[color:var(--color-coral)]" />}
            subtitle={`${totalBucketList} destination${totalBucketList !== 1 ? 's' : ''} on your bucket list`}
            actions={
              <>
                {/* Help / restart tour button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    document.getElementById('tour-restart-trigger')?.click()
                  }}
                  className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl cursor-pointer"
                  title="Take a tour"
                  aria-label="Take a tour of the wishlist"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>

                <Button
                  data-tour-step="add-destination-btn"
                  variant={showAddForm ? 'secondary' : 'coral'}
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="gap-2 shrink-0 rounded-full"
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
              </>
            }
          />
        </div>

        {/* ── Add Destination Form ──────────────────────────────── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              data-tour-step="add-destination-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-resting)]">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="al-eyebrow text-primary">
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
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Notes (optional)
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Why do you want to visit? Any must-see spots..."
                      className="rounded-xl resize-none min-h-[80px]"
                    />
                  </div>

                  {/* Priority Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Priority
                    </label>
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            priority === p
                              ? 'bg-primary/10 text-primary border-primary/40'
                              : 'bg-card text-muted-foreground border-border hover:border-primary/30'
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
                    className="w-full gap-2"
                  >
                    {isAdding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add to Wishlist
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Filter Tabs ───────────────────────────────────────── */}
        <motion.div
          data-tour-step="filter-tabs"
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
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                activeFilter === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {label}
              <span
                className={cn(
                  'ml-2 px-1.5 py-0.5 text-xs rounded-full inline-block',
                  activeFilter === key
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {counts[key]}
              </span>
            </button>
          ))}
        </motion.div>

        {/* ── Wishlist Grid ─────────────────────────────────────── */}
        <div data-tour-step="wishlist-grid">
          {filteredItems.length === 0 ? (
            <EnhancedEmptyState
              icon={<MapPin className="h-12 w-12" />}
              title={
                activeFilter === 'completed'
                  ? 'No Completed Destinations Yet'
                  : activeFilter === 'high'
                    ? 'No High Priority Destinations'
                    : 'Your Wishlist is Empty'
              }
              description={
                activeFilter === 'all'
                  ? 'Add destinations you dream of visiting.'
                  : undefined
              }
              action={activeFilter === 'all' ? { label: 'Add Destination', onClick: () => setShowAddForm(true) } : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    className="h-full"
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
                    <div
                      className={cn(
                        'group relative h-full rounded-2xl border border-border bg-card shadow-[var(--shadow-resting)] transition-all duration-200 ease-out',
                        item.completed_at
                          ? 'opacity-60'
                          : 'hover:border-primary/30 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5'
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
                                  'font-heading font-semibold text-foreground truncate',
                                  item.completed_at && 'line-through text-muted-foreground'
                                )}
                              >
                                {item.location_name}
                              </h3>
                            </div>
                            {item.notes && (
                              <p
                                className={cn(
                                  'text-sm text-muted-foreground line-clamp-2 mt-1',
                                  item.completed_at && 'line-through'
                                )}
                              >
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              'shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
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
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              <ArrowUpRight className="h-3 w-3" />
                              Suggested by @{item.shared_by?.username}
                            </span>
                          </div>
                        )}

                        {/* Bottom: date + actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono tracking-wide">
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
                                className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl text-primary hover:bg-primary/10 hover:text-primary cursor-pointer"
                                title="Mark as visited (creates an album)"
                                aria-label={`Mark ${item.location_name} as visited`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item.id)}
                              className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Remove"
                              aria-label={`Remove ${item.location_name} from wishlist`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Travel Partners Section ───────────────────────────── */}
        {travelPartners && travelPartners.length > 0 && (
          <motion.div
            data-tour-step="travel-partners"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-5 pt-4"
          >
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="al-eyebrow mb-0.5">Friends</p>
                <h2 className="al-display text-xl md:text-2xl">
                  Travel Partners&apos; Wishlists
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
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
                    'flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none min-w-[44px] min-h-[44px]',
                    expandedPartner === partner.id
                      ? 'bg-primary/10 ring-2 ring-primary/40'
                      : 'hover:bg-muted'
                  )}
                >
                  <Avatar className="h-12 w-12 ring-2 ring-border ring-offset-2 ring-offset-background">
                    <AvatarImage src={partner.avatar_url || undefined} alt={partner.display_name || partner.username} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {(partner.display_name || partner.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-muted-foreground max-w-[64px] truncate">
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
                      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-resting)]">
                        <div className="space-y-4">
                          {/* Partner header */}
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={partner.avatar_url || undefined}
                                  alt={partner.display_name || partner.username}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {(partner.display_name || partner.username || '?')
                                    .charAt(0)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-foreground text-sm">
                                  @{partner.username}
                                </p>
                                <p className="text-xs text-muted-foreground">
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
                                className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl cursor-pointer"
                                aria-label={`Close ${partner.display_name || partner.username}'s wishlist`}
                                title="Close"
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
                                <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                                  <p className="text-sm font-medium text-foreground">
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
                                    className="rounded-xl resize-none min-h-[60px] text-sm"
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
                                      className="gap-1.5"
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
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          ) : wishlistItems.length === 0 ? (
                            <p className="text-center py-6 text-sm text-muted-foreground">
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
                                    'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60',
                                    item.completed_at && 'opacity-50'
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
                                          'text-sm font-medium text-foreground truncate',
                                          item.completed_at && 'line-through text-muted-foreground'
                                        )}
                                      >
                                        {item.location_name}
                                      </p>
                                      {item.notes && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {item.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      'shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                      item.completed_at
                                        ? 'bg-primary/10 text-primary border border-primary/20'
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
                      </div>
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
