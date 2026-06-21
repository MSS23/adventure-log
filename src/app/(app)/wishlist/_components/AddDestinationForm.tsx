'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Loader2, Sparkles, MessageSquare } from 'lucide-react'
import { LocationSearchInput } from '@/components/albums/LocationSearchInput'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { type LocationData } from '@/lib/utils/locationUtils'
import { priorityConfig, type Priority } from './constants'

export interface NewDestination {
  location_name: string
  latitude: number
  longitude: number
  country_code?: string | null
  notes?: string
  priority: Priority
}

interface AddDestinationFormProps {
  open: boolean
  onSubmit: (destination: NewDestination) => Promise<void>
}

export function AddDestinationForm({ open, onSubmit }: AddDestinationFormProps) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = async () => {
    if (!location) return
    setIsAdding(true)
    try {
      await onSubmit({
        location_name: location.display_name,
        latitude: location.latitude,
        longitude: location.longitude,
        country_code: location.country_code,
        notes: notes.trim() || undefined,
        priority,
      })
      // Reset only on success — keep input if the request failed.
      setLocation(null)
      setNotes('')
      setPriority('medium')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
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
                <span className="al-eyebrow text-primary">New Destination</span>
              </div>

              <LocationSearchInput
                value={location}
                onChange={setLocation}
                placeholder="Search for a destination..."
                label="Where do you want to go?"
              />

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

              <Button
                onClick={handleSubmit}
                disabled={!location || isAdding}
                className="w-full gap-2"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add to Wishlist
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
