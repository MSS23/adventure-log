'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe2,
  Languages,
  Wallet,
  Zap,
  Heart,
  MapPin,
  Save,
  Loader2,
  Plus,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { GlassCard } from '@/components/ui/glass-card'
import type { TravelProfile } from '@/types/database'

interface TravelProfileFormProps {
  profile: TravelProfile | null
  onSave: (data: Partial<TravelProfile>) => void
  isSaving: boolean
}

const TRAVEL_STYLES = [
  'adventure',
  'relaxation',
  'culture',
  'food',
  'nature',
  'luxury',
  'backpacking',
  'photography',
  'family',
  'solo',
  'road-trip',
  'city-break',
]

const INTERESTS = [
  'hiking',
  'diving',
  'surfing',
  'museums',
  'architecture',
  'street-food',
  'wine-tasting',
  'nightlife',
  'history',
  'wildlife',
  'beaches',
  'mountains',
  'temples',
  'markets',
  'festivals',
  'yoga',
  'skiing',
  'photography',
  'camping',
  'volunteering',
]

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
  'Mandarin',
  'Arabic',
  'Hindi',
  'Russian',
  'Dutch',
  'Swedish',
  'Turkish',
  'Thai',
  'Vietnamese',
]

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget', icon: '$', desc: 'Hostels, street food' },
  { value: 'moderate', label: 'Moderate', icon: '$$', desc: 'Mid-range hotels' },
  { value: 'luxury', label: 'Luxury', icon: '$$$', desc: 'Premium experiences' },
]

const PACE_OPTIONS = [
  { value: 'slow', label: 'Slow', desc: 'Savoring each place' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced exploration' },
  { value: 'fast', label: 'Fast', desc: 'Seeing it all' },
]

export default function TravelProfileForm({
  profile,
  onSave,
  isSaving,
}: TravelProfileFormProps) {
  const [travelStyles, setTravelStyles] = useState<string[]>(profile?.travel_styles || [])
  const [interests, setInterests] = useState<string[]>(profile?.interests || [])
  const [languages, setLanguages] = useState<string[]>(profile?.languages || [])
  const [budget, setBudget] = useState<string>(profile?.preferred_budget || '')
  const [pace, setPace] = useState<string>(profile?.preferred_pace || '')
  const [destinations, setDestinations] = useState<string[]>(profile?.upcoming_destinations || [])
  const [newDestination, setNewDestination] = useState('')
  const [bioTravel, setBioTravel] = useState(profile?.bio_travel || '')
  const [isLooking, setIsLooking] = useState(profile?.is_looking_for_companions ?? true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setTravelStyles(profile.travel_styles || [])
      setInterests(profile.interests || [])
      setLanguages(profile.languages || [])
      setBudget(profile.preferred_budget || '')
      setPace(profile.preferred_pace || '')
      setDestinations(profile.upcoming_destinations || [])
      setBioTravel(profile.bio_travel || '')
      setIsLooking(profile.is_looking_for_companions ?? true)
    }
  }, [profile])

  const toggleItem = (list: string[], setList: (items: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item])
  }

  const addDestination = () => {
    const trimmed = newDestination.trim()
    if (trimmed && !destinations.includes(trimmed)) {
      setDestinations([...destinations, trimmed])
      setNewDestination('')
    }
  }

  const removeDestination = (dest: string) => {
    setDestinations(destinations.filter((d) => d !== dest))
  }

  const handleSave = () => {
    onSave({
      travel_styles: travelStyles,
      interests,
      languages,
      preferred_budget: (budget as TravelProfile['preferred_budget']) || undefined,
      preferred_pace: (pace as TravelProfile['preferred_pace']) || undefined,
      upcoming_destinations: destinations,
      bio_travel: bioTravel || undefined,
      is_looking_for_companions: isLooking,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Looking for Companions Toggle */}
      <GlassCard variant="featured" className="dark:bg-teal-900/20 dark:border-teal-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Looking for Travel Companions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Enable this to appear in companion search results
            </p>
          </div>
          <button
            onClick={() => setIsLooking(!isLooking)}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors duration-200',
              isLooking
                ? 'bg-teal-500'
                : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <motion.div
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
              animate={{ x: isLooking ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </GlassCard>

      {/* Travel Bio */}
      <GlassCard className="dark:bg-gray-800/80 dark:border-gray-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-teal-500" />
          Travel Bio
        </h3>
        <Textarea
          placeholder="Tell fellow travelers about your travel experiences and what you're looking for in a travel companion..."
          value={bioTravel}
          onChange={(e) => setBioTravel(e.target.value)}
          rows={3}
          className="resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </GlassCard>

      {/* Travel Styles */}
      <GlassCard className="dark:bg-gray-800/80 dark:border-gray-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-teal-500" />
          Travel Styles
        </h3>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_STYLES.map((style) => (
            <button
              key={style}
              onClick={() => toggleItem(travelStyles, setTravelStyles, style)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                travelStyles.includes(style)
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {style}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Interests */}
      <GlassCard className="dark:bg-gray-800/80 dark:border-gray-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-500" />
          Interests
        </h3>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleItem(interests, setInterests, interest)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                interests.includes(interest)
                  ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {interest}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Languages */}
      <GlassCard className="dark:bg-gray-800/80 dark:border-gray-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Languages className="h-4 w-4 text-blue-500" />
          Languages Spoken
        </h3>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => toggleItem(languages, setLanguages, lang)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                languages.includes(lang)
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Budget and Pace */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="dark:bg-gray-800/80 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-500" />
            Preferred Budget
          </h3>
          <div className="space-y-2">
            {BUDGET_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setBudget(option.value)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
                  budget === option.value
                    ? 'bg-amber-50 border-2 border-amber-400 dark:bg-amber-900/20 dark:border-amber-600'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                )}
              >
                <span className="text-lg font-bold text-amber-500">{option.icon}</span>
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{option.desc}</p>
                </div>
                {budget === option.value && (
                  <Check className="h-4 w-4 text-amber-500 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="dark:bg-gray-800/80 dark:border-gray-700/50">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-500" />
            Travel Pace
          </h3>
          <div className="space-y-2">
            {PACE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPace(option.value)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
                  pace === option.value
                    ? 'bg-cyan-50 border-2 border-cyan-400 dark:bg-cyan-900/20 dark:border-cyan-600'
                    : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600'
                )}
              >
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{option.desc}</p>
                </div>
                {pace === option.value && (
                  <Check className="h-4 w-4 text-cyan-500 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Upcoming Destinations */}
      <GlassCard className="dark:bg-gray-800/80 dark:border-gray-700/50">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-teal-500" />
          Upcoming Destinations
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Add places you plan to visit. This helps match you with travelers going to the same places.
        </p>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="e.g., Tokyo, Bali, Patagonia..."
            value={newDestination}
            onChange={(e) => setNewDestination(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDestination()}
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <Button
            onClick={addDestination}
            size="sm"
            variant="outline"
            className="border-teal-300 text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:text-teal-400 dark:hover:bg-teal-900/30"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <AnimatePresence>
          <div className="flex flex-wrap gap-2">
            {destinations.map((dest) => (
              <motion.span
                key={dest}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-full text-sm font-medium"
              >
                <MapPin className="h-3 w-3" />
                {dest}
                <button
                  onClick={() => removeDestination(dest)}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.span>
            ))}
          </div>
        </AnimatePresence>
      </GlassCard>

      {/* Save Button */}
      <motion.div
        className="sticky bottom-4 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'w-full h-12 text-base font-semibold rounded-xl shadow-lg transition-all duration-300',
            saved
              ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
              : 'bg-teal-500 hover:bg-teal-600 shadow-teal-500/25'
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Travel Profile
            </>
          )}
        </Button>
      </motion.div>
    </div>
  )
}
