'use client'

import { useState } from 'react'
import { X, Sparkles, Calendar, MapPin, DollarSign, Heart, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectInput } from '@/components/ui/select-input'
import { cn } from '@/lib/utils'
import { log } from '@/lib/utils/logger'

interface TripPlannerSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface TripFormData {
  country: string
  customCountry: string
  region: string
  numberOfDays: number
  travelDates: string
  travelStyle: string
  budget: string
  additionalDetails: string
}

export function TripPlannerSidebar({ isOpen, onClose }: TripPlannerSidebarProps) {
  const [formData, setFormData] = useState<TripFormData>({
    country: '',
    customCountry: '',
    region: '',
    numberOfDays: 7,
    travelDates: '',
    travelStyle: 'adventure',
    budget: 'budget-friendly',
    additionalDetails: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedItinerary, setGeneratedItinerary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remainingGenerations, setRemainingGenerations] = useState<number | null>(null)
  const [limitExceeded, setLimitExceeded] = useState(false)

  const popularCountries = [
    { value: '', label: 'Select a country' },
    { value: 'Italy', label: 'Italy' },
    { value: 'France', label: 'France' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Greece', label: 'Greece' },
    { value: 'Japan', label: 'Japan' },
    { value: 'Thailand', label: 'Thailand' },
    { value: 'Costa Rica', label: 'Costa Rica' },
    { value: 'United States', label: 'United States' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Australia', label: 'Australia' },
    { value: 'New Zealand', label: 'New Zealand' },
    { value: 'Mexico', label: 'Mexico' },
    { value: 'Portugal', label: 'Portugal' },
    { value: 'Iceland', label: 'Iceland' },
    { value: 'Norway', label: 'Norway' },
    { value: 'Switzerland', label: 'Switzerland' },
    { value: 'Morocco', label: 'Morocco' },
    { value: 'Peru', label: 'Peru' },
    { value: 'Argentina', label: 'Argentina' },
    { value: 'other', label: 'Other (type your own)' },
  ]

  const travelStyles = [
    { value: 'adventure', label: 'Adventure' },
    { value: 'relaxation', label: 'Relaxation' },
    { value: 'culture', label: 'Culture & History' },
    { value: 'food', label: 'Food & Culinary' },
    { value: 'nature', label: 'Nature & Wildlife' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'backpacking', label: 'Backpacking' },
    { value: 'family', label: 'Family-Friendly' }
  ]

  const budgetOptions = [
    { value: 'budget-friendly', label: 'Budget-Friendly' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'ultra-luxury', label: 'Ultra Luxury' }
  ]

  const handleInputChange = (field: keyof TripFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleGenerateTrip = async () => {
    // Get the actual country value
    const actualCountry = formData.country === 'other' ? formData.customCountry : formData.country

    // Validate required fields
    if (!actualCountry || !formData.region) {
      setError('Please fill in Country and Region/City')
      return
    }

    // Validate numberOfDays
    if (!formData.numberOfDays || formData.numberOfDays < 1 || formData.numberOfDays > 30) {
      setError('Please enter a valid trip duration between 1 and 30 days')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedItinerary(null)

    try {
      const response = await fetch('/api/trip-planner/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          country: actualCountry
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Check if it's a limit exceeded error
        if (response.status === 429 && errorData.limitExceeded) {
          setLimitExceeded(true)
          setRemainingGenerations(0)
        }

        throw new Error(errorData.error || 'Failed to generate trip')
      }

      const data = await response.json()
      setGeneratedItinerary(data.itinerary)
      setRemainingGenerations(data.remainingGenerations)

      log.info('Trip itinerary generated successfully', {
        component: 'TripPlannerSidebar',
        action: 'generateTrip',
        country: actualCountry,
        region: formData.region
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate trip. Please try again.'
      setError(errorMessage)
      log.error('Error generating trip', {
        component: 'TripPlannerSidebar',
        action: 'generateTrip'
      }, err as Error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setFormData({
      country: '',
      customCountry: '',
      region: '',
      numberOfDays: 7,
      travelDates: '',
      travelStyle: 'adventure',
      budget: 'budget-friendly',
      additionalDetails: ''
    })
    setGeneratedItinerary(null)
    setError(null)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">AI Trip Planner</h2>
                  <p className="text-xs text-gray-500">Let AI craft your perfect itinerary</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 px-6 py-6 space-y-5">
            {!generatedItinerary ? (
              <>
                {/* Country Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <SelectInput
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    icon={<MapPin className="h-4 w-4 text-gray-400" />}
                  >
                    {popularCountries.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </SelectInput>
                </div>

                {/* Custom Country Input (shows when "Other" is selected) */}
                {formData.country === 'other' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enter Country Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.customCountry}
                        onChange={(e) => handleInputChange('customCountry', e.target.value)}
                        placeholder="e.g., Monaco"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Region/City Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Region or City <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) => handleInputChange('region', e.target.value)}
                      placeholder="e.g., Rome, Tuscany, Northern Italy"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Enter a specific city, region, or area within the selected country
                  </p>
                </div>

                {/* Number of Days */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Trip Duration (Days) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={formData.numberOfDays}
                      onChange={(e) => handleInputChange('numberOfDays', e.target.value)}
                      placeholder="7"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    How many days will you be traveling? (1-30 days)
                  </p>
                </div>

                {/* Travel Dates */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Travel Dates <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.travelDates}
                      onChange={(e) => handleInputChange('travelDates', e.target.value)}
                      placeholder="e.g., March 2025 or March 15-22"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Travel Style */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Travel Style / Interests <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <SelectInput
                    value={formData.travelStyle}
                    onChange={(e) => handleInputChange('travelStyle', e.target.value)}
                    icon={<Heart className="h-4 w-4 text-gray-400" />}
                  >
                    {travelStyles.map((style) => (
                      <option key={style.value} value={style.value}>
                        {style.label}
                      </option>
                    ))}
                  </SelectInput>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Help us tailor your itinerary to your preferred travel style
                  </p>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Budget <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <SelectInput
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                    icon={<DollarSign className="h-4 w-4 text-gray-400" />}
                  >
                    {budgetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectInput>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Get budget-appropriate recommendations for accommodation and dining
                  </p>
                </div>

                {/* Additional Details */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Details <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={formData.additionalDetails}
                    onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
                    placeholder="e.g., 'Traveling with family', 'Must-see waterfalls'"
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all"
                  />
                </div>

                {/* Remaining Generations Info */}
                {remainingGenerations !== null && !limitExceeded && (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-teal-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-teal-900">
                          {remainingGenerations} {remainingGenerations === 1 ? 'generation' : 'generations'} remaining this month
                        </p>
                        <p className="text-xs text-teal-700 mt-1">
                          Free tier includes 3 AI trip generations per month. Upgrade to Premium for unlimited access!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Limit Exceeded Warning */}
                {limitExceeded && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">
                          Monthly limit reached
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          You've used all 3 free AI trip generations this month. Upgrade to Premium for unlimited access!
                        </p>
                        <button className="mt-2 text-xs font-semibold text-teal-600 hover:text-teal-700">
                          Upgrade to Premium →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </>
            ) : (
              /* Generated Itinerary Display */
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Your Personalized Itinerary</h3>
                    <p className="text-sm text-gray-600 mt-1 font-medium">
                      {formData.country === 'other' ? formData.customCountry : formData.country} • {formData.region} • {formData.numberOfDays} {formData.numberOfDays === 1 ? 'Day' : 'Days'}
                    </p>
                  </div>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="sm"
                    className="text-teal-600 hover:text-teal-700 border-teal-300"
                  >
                    New Trip
                  </Button>
                </div>

                {/* Success Message */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <Sparkles className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">Trip Generated Successfully!</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        Your {formData.numberOfDays}-day itinerary is ready with specific activities and timing for each period!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parse sections from the itinerary */}
                {(() => {
                  const sections = generatedItinerary?.split('\n\n') || []

                  // Extract Overview (first 3-4 sections typically)
                  const overviewEndIndex = sections.findIndex(s => s.includes('Day 1') || s.includes('**Day 1'))
                  const overviewSections = overviewEndIndex > 0 ? sections.slice(0, overviewEndIndex) : sections.slice(0, 3)

                  // Extract Day-by-Day Itinerary
                  const itineraryStartIndex = sections.findIndex(s => s.includes('Day 1') || s.includes('**Day 1'))
                  const itineraryEndIndex = sections.findIndex((s, i) =>
                    i > itineraryStartIndex &&
                    (s.includes('Accommodation') || s.includes('Local Cuisine') || s.includes('Transportation') || s.includes('Budget'))
                  )
                  const itinerarySections = itineraryStartIndex >= 0 && itineraryEndIndex > itineraryStartIndex
                    ? sections.slice(itineraryStartIndex, itineraryEndIndex)
                    : []

                  // Extract Practical Info (everything after day-by-day)
                  const practicalSections = itineraryEndIndex > 0 ? sections.slice(itineraryEndIndex) : []

                  const renderSection = (section: string, index: number) => {
                    // Check if this is a heading (starts with **)
                    if (section.trim().startsWith('**') && section.trim().endsWith('**')) {
                      const heading = section.replace(/\*\*/g, '').trim()
                      return (
                        <h3 key={index} className="text-lg font-bold text-gray-900 mt-6 first:mt-0 mb-3 pb-2 border-b border-gray-200">
                          {heading}
                        </h3>
                      )
                    }

                    // Check if this is a subheading (contains ** inline)
                    if (section.includes('**')) {
                      const formattedSection = section.split('**').map((part, i) => {
                        if (i % 2 === 1) {
                          return <strong key={i} className="font-semibold text-gray-900">{part}</strong>
                        }
                        return part
                      })
                      return (
                        <p key={index} className="text-[15px] leading-relaxed">
                          {formattedSection}
                        </p>
                      )
                    }

                    // Check if this contains a list (starts with - or •)
                    if (section.includes('\n- ') || section.includes('\n• ')) {
                      const lines = section.split('\n')
                      return (
                        <div key={index} className="space-y-2">
                          {lines.map((line, lineIndex) => {
                            if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
                              return (
                                <div key={lineIndex} className="flex gap-3">
                                  <span className="text-teal-600 mt-1 flex-shrink-0">•</span>
                                  <span className="flex-1 text-[15px]">{line.replace(/^[•\-]\s*/, '')}</span>
                                </div>
                              )
                            }
                            return line && <p key={lineIndex} className="text-[15px] font-medium text-gray-900">{line}</p>
                          })}
                        </div>
                      )
                    }

                    // Check if this is a separator
                    if (section.trim() === '---' || section.trim() === '===') {
                      return <hr key={index} className="my-6 border-gray-200" />
                    }

                    // Regular paragraph
                    return section.trim() && (
                      <p key={index} className="text-[15px] leading-relaxed">
                        {section}
                      </p>
                    )
                  }

                  return (
                    <>
                      {/* Overview Card */}
                      {overviewSections.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                          <div className="p-5 border-b border-gray-100">
                            <h4 className="text-base font-bold text-gray-900">📍 Destination Overview</h4>
                          </div>
                          <div className="p-5">
                            <div className="space-y-4 text-gray-700 leading-relaxed">
                              {overviewSections.map((section, index) => renderSection(section, index))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Day-by-Day Itinerary Card */}
                      {itinerarySections.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                          <div className="p-5 border-b border-gray-100">
                            <h4 className="text-base font-bold text-gray-900">🗓️ Day-by-Day Itinerary</h4>
                            <p className="text-xs text-gray-600 mt-1">
                              Specific activities and timing for each period of your {formData.numberOfDays}-day trip
                            </p>
                          </div>
                          <div className="p-5 max-h-[500px] overflow-y-auto">
                            <div className="space-y-6 text-gray-700 leading-relaxed">
                              {itinerarySections.map((section, index) => renderSection(section, index))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Practical Information Card */}
                      {practicalSections.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                          <div className="p-5 border-b border-gray-100">
                            <h4 className="text-base font-bold text-gray-900">💡 Practical Information</h4>
                            <p className="text-xs text-gray-600 mt-1">
                              Accommodation, dining, transportation, budget, and travel tips
                            </p>
                          </div>
                          <div className="p-5 max-h-[400px] overflow-y-auto">
                            <div className="space-y-6 text-gray-700 leading-relaxed">
                              {practicalSections.map((section, index) => renderSection(section, index))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Action Buttons */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-3">Save & Share Your Itinerary</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={(event) => {
                          navigator.clipboard.writeText(generatedItinerary || '')
                          // Show success feedback
                          const button = event.currentTarget as HTMLButtonElement
                          if (button) {
                            const originalText = button.textContent
                            button.textContent = '✓ Copied!'
                            setTimeout(() => {
                              button.textContent = originalText
                            }, 2000)
                          }
                        }}
                        variant="outline"
                        className="border-gray-300 hover:bg-white hover:shadow-sm font-medium transition-all"
                      >
                        📋 Copy
                      </Button>
                      <Button
                        onClick={() => {
                          const subject = `${formData.numberOfDays}-Day Trip to ${formData.region}, ${formData.country === 'other' ? formData.customCountry : formData.country}`
                          const body = generatedItinerary
                          window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body || '')}`
                        }}
                        variant="outline"
                        className="border-gray-300 hover:bg-white hover:shadow-sm font-medium transition-all"
                      >
                        ✉️ Email
                      </Button>
                    </div>
                    <Button
                      onClick={handleReset}
                      className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Plan Another Trip
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mt-3 pt-3 border-t border-gray-200">
                    <strong className="font-semibold text-gray-700">Note:</strong> This itinerary was AI-generated based on your preferences.
                    Always verify details and make reservations in advance.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Generate Button */}
          {!generatedItinerary && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <Button
                onClick={handleGenerateTrip}
                disabled={isGenerating || limitExceeded}
                className="w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Trip...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Generate Trip
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
