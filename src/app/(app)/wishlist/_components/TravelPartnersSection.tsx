'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { cn } from '@/lib/utils'
import { countryCodeToFlag } from '@/lib/countries'
import { getAvatarUrl } from '@/lib/utils/avatar'
import { getDisplayName, getDisplayInitial } from '@/lib/utils/display-name'
import { type LocationData } from '@/lib/utils/locationUtils'
import type { WishlistItem, TravelPartner } from '@/lib/hooks/useWishlist'
import { priorityOf } from './constants'

interface SuggestParams {
  location_name: string
  latitude: number
  longitude: number
  country_code?: string | null
  notes?: string
}

interface TravelPartnersSectionProps {
  partners: TravelPartner[]
  partnerWishlists: Map<string, WishlistItem[]>
  loadPartnerWishlist: (partnerId: string) => Promise<WishlistItem[]>
  suggestToPartner: (partnerId: string, params: SuggestParams) => Promise<unknown>
}

export function TravelPartnersSection({
  partners,
  partnerWishlists,
  loadPartnerWishlist,
  suggestToPartner,
}: TravelPartnersSectionProps) {
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null)
  const [suggestingTo, setSuggestingTo] = useState<string | null>(null)
  const [suggestLocation, setSuggestLocation] = useState<LocationData | null>(null)
  const [suggestNote, setSuggestNote] = useState('')
  const [isSuggesting, setIsSuggesting] = useState(false)

  const handleExpandPartner = async (partnerId: string) => {
    if (expandedPartner === partnerId) {
      setExpandedPartner(null)
      return
    }
    setExpandedPartner(partnerId)
    await loadPartnerWishlist(partnerId)
  }

  const resetSuggest = () => {
    setSuggestingTo(null)
    setSuggestLocation(null)
    setSuggestNote('')
  }

  const handleSuggest = async (partner: TravelPartner) => {
    if (!suggestLocation) return
    setIsSuggesting(true)
    try {
      await suggestToPartner(partner.id, {
        location_name: suggestLocation.display_name,
        latitude: suggestLocation.latitude,
        longitude: suggestLocation.longitude,
        country_code: suggestLocation.country_code,
        notes: suggestNote.trim() || undefined,
      })
      toast.success(`Suggested to @${partner.username || 'partner'}!`)
      resetSuggest()
    } catch {
      toast.error('Failed to send suggestion')
    } finally {
      setIsSuggesting(false)
    }
  }

  if (!partners || partners.length === 0) return null

  const expanded = partners.find((p) => p.id === expandedPartner) ?? null

  return (
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
          <h2 className="al-display text-xl md:text-2xl">Travel Partners&apos; Wishlists</h2>
          <p className="text-sm text-muted-foreground mt-1">See where your friends want to go</p>
        </div>
      </div>

      {/* Partner avatars */}
      <div className="flex gap-3 flex-wrap">
        {partners.map((partner) => (
          <button
            key={partner.id}
            type="button"
            onClick={() => handleExpandPartner(partner.id)}
            aria-label={`View ${getDisplayName(partner.display_name, partner.username)}'s wishlist`}
            aria-pressed={expandedPartner === partner.id}
            className={cn(
              'flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none min-w-[44px] min-h-[44px]',
              expandedPartner === partner.id ? 'bg-primary/10 ring-2 ring-primary/40' : 'hover:bg-muted'
            )}
          >
            <Avatar className="h-12 w-12 ring-2 ring-border ring-offset-2 ring-offset-background">
              <AvatarImage
                src={getAvatarUrl(partner.avatar_url, partner.username)}
                alt={getDisplayName(partner.display_name, partner.username)}
              />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {getDisplayInitial(partner.display_name, partner.username)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-muted-foreground max-w-[64px] truncate">
              {getDisplayName(partner.display_name, partner.username)}
            </span>
          </button>
        ))}
      </div>

      {/* Expanded partner wishlist */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {(() => {
              const wishlistItems = partnerWishlists.get(expanded.id)
              return (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-resting)]">
                  <div className="space-y-4">
                    {/* Partner header */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={getAvatarUrl(expanded.avatar_url, expanded.username)}
                            alt={getDisplayName(expanded.display_name, expanded.username)}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getDisplayInitial(expanded.display_name, expanded.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {getDisplayName(expanded.display_name, expanded.username)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {wishlistItems?.length ?? 0} destination
                            {(wishlistItems?.length ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSuggestingTo(suggestingTo === expanded.id ? null : expanded.id)}
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
                          aria-label={`Close ${getDisplayName(expanded.display_name, expanded.username)}'s wishlist`}
                          title="Close"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Suggest form */}
                    <AnimatePresence>
                      {suggestingTo === expanded.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl bg-muted/50 p-4 space-y-3">
                            <p className="text-sm font-medium text-foreground">
                              Suggest a destination to @{expanded.username}
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
                              <Button variant="ghost" size="sm" onClick={resetSuggest}>
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                disabled={!suggestLocation || isSuggesting}
                                onClick={() => handleSuggest(expanded)}
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

                    {/* Partner items */}
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
                        {wishlistItems.map((item, idx) => (
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
                                <span className="text-base">{countryCodeToFlag(item.country_code)}</span>
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
                                  <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
                                )}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                item.completed_at
                                  ? 'bg-primary/10 text-primary border border-primary/20'
                                  : priorityOf(item.priority).color
                              )}
                            >
                              {item.completed_at ? 'Visited' : priorityOf(item.priority).label}
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
  )
}
