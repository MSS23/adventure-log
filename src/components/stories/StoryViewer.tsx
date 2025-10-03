'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Flag, BarChart3, Clock, Check } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CountrySearch } from '@/components/common/CountrySearch'
import { StoryWithStats } from '@/types/database'
import { countryCodeToFlag, formatCountryCodeDisplay } from '@/lib/countries'
import { guessStory } from '@/app/(app)/stories/actions'
import { toast } from 'sonner'
import { Platform } from '@/lib/utils/platform'

export interface StoryViewerProps {
  stories: StoryWithStats[]
  initialIndex?: number
  onClose: () => void
  onStoryGuess?: (storyId: string, guess: string) => Promise<void>
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
}

export function StoryViewer({ stories, initialIndex = 0, onClose, onStoryGuess }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [selectedCountry, setSelectedCountry] = useState<string | undefined>()
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<NodeJS.Timeout | null>(null)
  const touchRef = useRef<TouchState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentStory = stories[currentIndex]
  const canGuess = currentStory?.can_guess && !currentStory.is_expired
  const hasGuessed = !!currentStory?.user_guess
  const shouldShowResults = showResults || currentStory?.is_expired || currentStory?.is_owner || hasGuessed

  // Navigation functions
  const handleNextStory = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedCountry(undefined)
      setShowResults(false)
    } else {
      onClose()
    }
  }, [currentIndex, stories.length, onClose])

  const handlePreviousStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setSelectedCountry(undefined)
      setShowResults(false)
    }
  }, [currentIndex])

  // Story auto-advance timer
  useEffect(() => {
    if (shouldShowResults || isSubmittingGuess) return

    setProgress(0)
    progressRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNextStory()
          return 0
        }
        return prev + 1
      })
    }, 80) // 8 seconds total (100 * 80ms)

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current)
      }
    }
  }, [currentIndex, shouldShowResults, isSubmittingGuess, handleNextStory])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          handlePreviousStory()
          break
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          handleNextStory()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handleNextStory, handlePreviousStory])

  // Focus management for accessibility
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus()
    }
  }, [])

  const handleSubmitGuess = async () => {
    if (!selectedCountry || !currentStory || isSubmittingGuess) return

    setIsSubmittingGuess(true)

    try {
      if (onStoryGuess) {
        await onStoryGuess(currentStory.id, selectedCountry)
      } else {
        const result = await guessStory({
          story_id: currentStory.id,
          guess_code: selectedCountry
        })

        if (!result.success) {
          toast.error(result.error || 'Failed to submit guess')
          return
        }
      }

      setShowResults(true)
      toast.success('Guess submitted!')
    } catch (error) {
      console.error('Failed to submit guess:', error)
      toast.error('Failed to submit guess')
    } finally {
      setIsSubmittingGuess(false)
    }
  }

  // Touch/swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!Platform.isNative() && e.touches.length === 1) {
      const touch = e.touches[0]
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now()
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current || Platform.isNative()) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchRef.current.startX
    const deltaY = touch.clientY - touchRef.current.startY
    const deltaTime = Date.now() - touchRef.current.startTime

    // Only handle swipes, not taps
    if (Math.abs(deltaX) > 50 && deltaTime < 300 && Math.abs(deltaY) < 100) {
      if (deltaX > 0) {
        handlePreviousStory()
      } else {
        handleNextStory()
      }
    } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 200) {
      // Handle tap to advance
      if (!shouldShowResults && !canGuess) {
        handleNextStory()
      }
    }

    touchRef.current = null
  }

  // Pan gesture handling with framer-motion
  const handlePan = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Only handle horizontal pans
    if (Math.abs(info.delta.x) > Math.abs(info.delta.y) && Math.abs(info.delta.x) > 10) {
      if (info.delta.x > 50) {
        handlePreviousStory()
      } else if (info.delta.x < -50) {
        handleNextStory()
      }
    }
  }

  if (!currentStory) {
    return null
  }

  return (
    <motion.div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      tabIndex={-1}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      <div className="absolute top-4 left-4 right-4 z-20">
        <div className="flex gap-1 mb-4">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  index < currentIndex
                    ? 'w-full'
                    : index === currentIndex
                    ? `w-[${progress}%]`
                    : 'w-0'
                }`}
                style={{
                  width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={currentStory.user?.avatar_url} alt={currentStory.user?.display_name} />
              <AvatarFallback>
                {currentStory.user?.display_name?.[0] || currentStory.user?.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {currentStory.user?.display_name || currentStory.user?.username}
              </p>
              <div className="flex items-center gap-2 text-xs text-white/80">
                <Clock className="w-3 h-3" />
                <span>{new Date(currentStory.created_at).toLocaleDateString()}</span>
                {currentStory.is_expired && (
                  <Badge variant="secondary" className="text-xs">Expired</Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
            aria-label="Close story viewer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousStory}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 text-white hover:bg-white/20"
          aria-label="Previous story"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
      )}

      {currentIndex < stories.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextStory}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 text-white hover:bg-white/20"
          aria-label="Next story"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      )}

      {/* Story content */}
      <motion.div
        className="relative w-full h-full max-w-sm mx-auto"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onPan={handlePan}
        dragElastic={0.2}
      >
        {/* Story image */}
        <div className="relative w-full h-full bg-gray-900">
          <Image
            src={currentStory.image_url || currentStory.media_url}
            alt="Story"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 640px) 100vw, 384px"
          />

          {/* Gradient overlay for readability */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        {/* Country guessing overlay */}
        <AnimatePresence mode="wait">
          {!shouldShowResults && canGuess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bottom-4 left-4 right-4 z-10"
            >
              <Card className="bg-black/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <Flag className="w-8 h-8 mx-auto mb-2 text-white" />
                    <h3 className="text-white font-semibold text-lg">
                      Guess which country I&apos;m in!
                    </h3>
                    <p className="text-white/80 text-sm">
                      Select a country from the search below
                    </p>
                  </div>

                  <div className="space-y-4">
                    <CountrySearch
                      value={selectedCountry}
                      onChange={setSelectedCountry}
                      placeholder="Type to search countries..."
                      disabled={isSubmittingGuess}
                    />

                    <Button
                      onClick={handleSubmitGuess}
                      disabled={!selectedCountry || isSubmittingGuess}
                      className="w-full"
                      size="lg"
                    >
                      {isSubmittingGuess ? 'Submitting...' : 'Submit Guess'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Results overlay */}
          {shouldShowResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 right-4 z-10"
            >
              <Card className="bg-black/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-4xl">
                        {currentStory.country_code && countryCodeToFlag(currentStory.country_code)}
                      </span>
                      {hasGuessed && currentStory.user_guess?.guess_code === currentStory.country_code && (
                        <Check className="w-6 h-6 text-green-400" />
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-lg">
                      {currentStory.country_code && formatCountryCodeDisplay(currentStory.country_code)}
                    </h3>
                    {hasGuessed && currentStory.user_guess?.guess_code && (
                      <p className="text-white/80 text-sm">
                        Your guess: {formatCountryCodeDisplay(currentStory.user_guess.guess_code)}
                        {currentStory.user_guess?.guess_code === currentStory.country_code ? (
                          <span className="text-green-400 ml-2">✓ Correct!</span>
                        ) : (
                          <span className="text-red-400 ml-2">✗ Incorrect</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Stats for owner or expired stories */}
                  {currentStory.stats && (currentStory.is_owner || currentStory.is_expired) && (
                    <div className="space-y-3 pt-3 border-t border-white/20">
                      <div className="flex items-center gap-2 text-white">
                        <BarChart3 className="w-4 h-4" />
                        <span className="font-medium">Results</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {currentStory.stats.total_guesses}
                          </p>
                          <p className="text-white/80 text-sm">Total Guesses</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-white">
                            {currentStory.stats.correct_percentage}%
                          </p>
                          <p className="text-white/80 text-sm">Correct</p>
                        </div>
                      </div>

                      {currentStory.stats.top_guesses && currentStory.stats.top_guesses.length > 0 && (
                        <div>
                          <p className="text-white/80 text-sm mb-2">Top Guesses:</p>
                          <div className="space-y-1">
                            {currentStory.stats.top_guesses?.slice(0, 3).map((guess) => (
                              <div key={guess.country_code} className="flex items-center justify-between text-sm">
                                <span className="text-white">
                                  {formatCountryCodeDisplay(guess.country_code)}
                                </span>
                                <span className="text-white/80">{guess.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleNextStory}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {currentIndex < stories.length - 1 ? 'Next Story' : 'Close'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tap hint for non-interactive stories */}
          {!canGuess && !shouldShowResults && (
            <div className="absolute bottom-4 left-4 right-4 z-10 text-center">
              <p className="text-white/80 text-sm">Tap to continue</p>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}