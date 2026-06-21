'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { cn } from '@/lib/utils'
import { type LocationData } from '@/lib/utils/locationUtils'
import type { WishlistItem, ChecklistItem } from '@/lib/hooks/useWishlist'
import { priorityConfig, type Priority } from './constants'
import { ChecklistEditor } from './ChecklistEditor'

export interface EditUpdates {
  notes: string | null
  priority: Priority
  checklist: ChecklistItem[]
  location_name?: string
  country_code?: string | null
  latitude?: number
  longitude?: number
}

interface EditDestinationModalProps {
  item: WishlistItem | null
  onClose: () => void
  /** Persist changes. Resolve to close the modal; reject to keep it open. */
  onSave: (id: string, updates: EditUpdates) => Promise<void>
}

export function EditDestinationModal({ item, onClose, onSave }: EditDestinationModalProps) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync local form state whenever a new item is opened.
  useEffect(() => {
    if (item) {
      setLocation({
        display_name: item.location_name,
        latitude: item.latitude,
        longitude: item.longitude,
        country_code: item.country_code ?? undefined,
      })
      setNotes(item.notes || '')
      setPriority((item.priority as Priority) || 'medium')
      setChecklist(item.checklist ?? [])
    }
  }, [item])

  const handleSave = async () => {
    if (!item || !location) return
    setIsUpdating(true)
    try {
      const updates: EditUpdates = { notes: notes.trim() || null, priority, checklist }

      // Only send location fields if the destination actually changed —
      // avoids needless writes and keeps the unique-constraint surface small.
      const locationChanged =
        location.display_name !== item.location_name ||
        location.latitude !== item.latitude ||
        location.longitude !== item.longitude

      if (locationChanged) {
        updates.location_name = location.display_name
        updates.country_code = location.country_code ?? null
        updates.latitude = location.latitude
        updates.longitude = location.longitude
      }

      await onSave(item.id, updates)
      onClose()
    } catch {
      // Parent surfaces the error toast; keep the modal open.
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Edit destination"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-hover)]"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="al-eyebrow text-primary">Edit Destination</p>
                  <h2 className="font-heading font-semibold text-foreground mt-0.5">
                    Update this dream trip
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-9 w-9 min-w-[44px] min-h-[44px] p-0 rounded-xl shrink-0 cursor-pointer"
                  aria-label="Close edit dialog"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Destination (editable) */}
              <LocationSearchInput
                value={location}
                onChange={setLocation}
                placeholder="Search for a destination..."
                label="Destination"
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Notes
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why do you want to visit? Any must-see spots..."
                  className="rounded-xl resize-none min-h-[80px]"
                />
              </div>

              {/* Things to do / see */}
              <ChecklistEditor value={checklist} onChange={setChecklist} />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Priority</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={priority === p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        priority === p
                          ? 'bg-primary/10 text-primary border-primary/40'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                      )}
                    >
                      <span className={cn('w-2 h-2 rounded-full', priorityConfig[p].dot)} />
                      {priorityConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={onClose} disabled={isUpdating}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isUpdating || !location} className="gap-2">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
