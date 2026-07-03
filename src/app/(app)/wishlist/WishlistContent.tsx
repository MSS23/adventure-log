'use client'

import { useState, useMemo, useCallback } from 'react'
import { useWishlist, type WishlistItem, type TravelPartner } from '@/lib/hooks/useWishlist'
import { Button } from '@/components/ui/button'
import { WalkthroughTour, type TourStep } from '@/components/ui/walkthrough-tour'
import { toast } from 'sonner'
import {
  Star,
  Plus,
  X,
  MapPin,
  Sparkles,
  Users,
  Filter,
  ListChecks,
  HelpCircle,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { EnhancedEmptyState } from '@/components/ui/enhanced-empty-state'
import { PageHeader } from '@/components/layout/PageHeader'
import type { FilterTab } from './_components/constants'
import { AddDestinationForm, type NewDestination } from './_components/AddDestinationForm'
import { FilterTabs } from './_components/FilterTabs'
import { WishlistCard } from './_components/WishlistCard'
import { EditDestinationModal, type EditUpdates } from './_components/EditDestinationModal'
import { TravelPartnersSection } from './_components/TravelPartnersSection'
import { SaveFromLinkCard } from './_components/SaveFromLinkCard'
import { AddToTripDialog } from './_components/AddToTripDialog'
import type { AddPlaceParams } from '@/lib/links/place-types'

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
    updateItem,
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
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [tripItem, setTripItem] = useState<WishlistItem | null>(null)

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'high':
        return items.filter((item) => item.priority === 'high' && !item.completed_at)
      case 'completed':
        return items.filter((item) => item.completed_at)
      default:
        return items.filter((item) => !item.completed_at)
    }
  }, [items, activeFilter])

  const counts = useMemo<Record<FilterTab, number>>(
    () => ({
      all: items.filter((i) => !i.completed_at).length,
      high: items.filter((i) => i.priority === 'high' && !i.completed_at).length,
      completed: items.filter((i) => i.completed_at).length,
    }),
    [items]
  )

  const handleAddDestination = async (dest: NewDestination) => {
    try {
      await addItem(dest)
      toast.success('Destination added to your wishlist!')
      setShowAddForm(false)
    } catch (error) {
      toast.error('Failed to add destination')
      throw error // keep the form populated
    }
  }

  // A confirmed place from the link-extract flow becomes a wishlist item —
  // saved places and the bucket list are one concept (migration 67).
  const handleSavePlaceFromLink = async (params: AddPlaceParams) => {
    await addItem({
      location_name: params.place_name,
      country_code: params.country_code ?? null,
      latitude: params.latitude,
      longitude: params.longitude,
      notes: params.notes ?? null,
      city: params.city ?? null,
      category: params.category ?? null,
      source_platform: params.source_platform ?? null,
      source_url: params.source_url ?? null,
      thumbnail_url: params.thumbnail_url ?? null,
    })
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

  const handleSaveEdit = async (id: string, updates: EditUpdates) => {
    try {
      await updateItem(id, updates)
      toast.success('Destination updated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update destination'
      toast.error(message)
      throw error // keep the modal open
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

  // ── Tour Steps ─────────────────────────────────────────────
  const openAddFormForTour = useCallback(() => setShowAddForm(true), [])

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
          "Use these tabs to filter your destinations. View all active items, focus on high priority must-visits, or see places you've already been to.",
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

  const totalBucketList = counts.all

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* ── Walkthrough Tour ───────────────────────────────── */}
      <WalkthroughTour tourId="wishlist-tour" steps={tourSteps} autoStart={true}>
        {(startTour) => (
          /* Hidden trigger — we use the help button instead */
          <button
            type="button"
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
            eyebrow="Places"
            title={<>Wishlist</>}
            icon={<Star className="h-7 w-7 text-[color:var(--color-coral)]" />}
            subtitle={`Places you want to go · ${totalBucketList}`}
            actions={
              <>
                {/* Help / restart tour button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById('tour-restart-trigger')?.click()}
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

        {/* ── Save from a link (TikTok / Google Maps → wishlist) ── */}
        <SaveFromLinkCard onSave={handleSavePlaceFromLink} />

        {/* ── Add Destination Form ──────────────────────────────── */}
        <AddDestinationForm open={showAddForm} onSubmit={handleAddDestination} />

        {/* ── Filter Tabs ───────────────────────────────────────── */}
        <FilterTabs active={activeFilter} counts={counts} onChange={setActiveFilter} />

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
                  ? 'Add destinations you dream of visiting, or paste a TikTok link above.'
                  : undefined
              }
              action={
                activeFilter === 'all'
                  ? { label: 'Add Destination', onClick: () => setShowAddForm(true) }
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    index={index}
                    onMarkCompleted={handleMarkCompleted}
                    onEdit={setEditingItem}
                    onRemove={handleRemoveItem}
                    onAddToTrip={setTripItem}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Travel Partners Section ───────────────────────────── */}
        <TravelPartnersSection
          partners={travelPartners}
          partnerWishlists={partnerWishlists}
          loadPartnerWishlist={loadPartnerWishlist}
          suggestToPartner={suggestToPartner}
        />
      </div>

      {/* ── Add to Trip ───────────────────────────────────────── */}
      <AddToTripDialog
        place={
          tripItem
            ? {
                place_name: tripItem.location_name,
                latitude: tripItem.latitude,
                longitude: tripItem.longitude,
                location_name: tripItem.city ?? null,
                source_url: tripItem.source_url ?? null,
                category: tripItem.category ?? null,
                notes: tripItem.notes ?? null,
              }
            : null
        }
        open={tripItem !== null}
        onClose={() => setTripItem(null)}
      />

      {/* ── Edit Destination Modal ────────────────────────────── */}
      <EditDestinationModal
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
