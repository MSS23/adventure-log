'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  X,
  ArrowRight,
  ArrowLeft,
  Mouse,
  MousePointer,
  RotateCw,
  ZoomIn,
  Play,
  MapPin,
  Plane,
  Calendar,
  Sparkles,
  CheckCircle,
  Hand
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlobeTutorialProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

interface TutorialStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center'
  highlight?: string
  action?: string
  tip?: string
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Travel Globe',
    description: 'This interactive 3D globe shows all your travel destinations and journeys. Let\'s learn how to navigate and explore your adventures!',
    icon: Sparkles,
    position: 'center',
    action: 'Get Started'
  },
  {
    id: 'rotate',
    title: 'Rotate the Globe',
    description: 'Click and drag anywhere on the globe to rotate it in any direction. Explore different continents and find your destinations.',
    icon: RotateCw,
    position: 'bottom-center',
    highlight: 'globe-canvas',
    tip: 'Try rotating now!'
  },
  {
    id: 'zoom',
    title: 'Zoom In and Out',
    description: 'Use your mouse wheel or trackpad to zoom in for a closer look at specific regions, or zoom out to see the whole world.',
    icon: ZoomIn,
    position: 'bottom-center',
    highlight: 'globe-canvas',
    tip: 'Scroll to zoom!'
  },
  {
    id: 'timeline',
    title: 'Travel Timeline',
    description: 'Select a year from your travels to see your journey for that specific year. Watch your adventures unfold chronologically.',
    icon: Calendar,
    position: 'top-right',
    highlight: 'timeline-controls',
    tip: 'Try selecting a year'
  },
  {
    id: 'destinations',
    title: 'Your Destinations',
    description: 'Your travel destinations appear as colored pins on the globe. Click on any pin to see details about that location and your photos.',
    icon: MapPin,
    position: 'center',
    highlight: 'city-pins',
    tip: 'Click on a pin to explore'
  },
  {
    id: 'animations',
    title: 'Flight Animations',
    description: 'Watch realistic flight paths between your destinations. Use the play button to see your journey animated with flight routes.',
    icon: Plane,
    position: 'bottom-left',
    highlight: 'animation-controls',
    tip: 'Press play to watch flights'
  },
  {
    id: 'controls',
    title: 'Playback Controls',
    description: 'Control the speed of animations, pause, reset, or jump to specific parts of your journey using the timeline controls.',
    icon: Play,
    position: 'bottom-center',
    highlight: 'playback-controls',
    tip: 'Experiment with different speeds'
  },
  {
    id: 'complete',
    title: 'You\'re Ready to Explore!',
    description: 'You now know how to navigate your travel globe. Create albums with location data to see your own destinations appear here.',
    icon: CheckCircle,
    position: 'center',
    action: 'Start Exploring'
  }
]

export function GlobeTutorial({ isOpen, onClose, onComplete }: GlobeTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setCurrentStep(0)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  const currentStepData = TUTORIAL_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  const handleComplete = () => {
    onComplete?.()
    onClose()
  }

  const handleSkip = () => {
    handleComplete()
  }

  const getPositionClasses = (position: TutorialStep['position']) => {
    switch (position) {
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2'
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      {/* Overlay */}
      <div className="absolute inset-0" onClick={handleSkip} />

      {/* Highlight Areas */}
      {currentStepData.highlight && (
        <div
          className="absolute border-4 border-blue-500 rounded-lg pointer-events-none animate-pulse"
          style={{
            // These would be dynamically positioned based on the highlighted element
            // For now, we'll use placeholder positioning
            top: currentStepData.highlight === 'timeline-controls' ? '20px' :
                 currentStepData.highlight === 'animation-controls' ? 'auto' : '50%',
            bottom: currentStepData.highlight === 'animation-controls' ? '100px' : 'auto',
            left: currentStepData.highlight === 'timeline-controls' ? 'auto' :
                  currentStepData.highlight === 'animation-controls' ? '20px' : '50%',
            right: currentStepData.highlight === 'timeline-controls' ? '20px' : 'auto',
            width: currentStepData.highlight === 'globe-canvas' ? '60%' : '300px',
            height: currentStepData.highlight === 'globe-canvas' ? '60%' : '80px',
            transform: currentStepData.highlight === 'globe-canvas' ? 'translate(-50%, -50%)' : 'none'
          }}
        />
      )}

      {/* Tutorial Card */}
      <Card className={cn(
        "absolute w-full max-w-md mx-auto bg-white shadow-2xl border-0",
        getPositionClasses(currentStepData.position),
        currentStepData.position === 'center' && "max-w-lg"
      )}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <currentStepData.icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{currentStepData.title}</h3>
                <Badge variant="outline" className="text-xs mt-1">
                  Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">
              {currentStepData.description}
            </p>

            {currentStepData.tip && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Hand className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800 font-medium">
                  {currentStepData.tip}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Progress</span>
                <span>{Math.round(((currentStep + 1) / TUTORIAL_STEPS.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-gray-600"
                >
                  Skip Tutorial
                </Button>
              </div>

              <Button
                onClick={handleNext}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLastStep ? (
                  currentStepData.action || 'Complete'
                ) : (
                  currentStepData.action || 'Next'
                )}
                {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
                {isLastStep && <CheckCircle className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Hints */}
      {currentStepData.highlight === 'globe-canvas' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex items-center justify-center">
            {currentStep === 1 && (
              <div className="animate-pulse">
                <MousePointer className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            )}
            {currentStep === 2 && (
              <div className="animate-bounce">
                <Mouse className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 left-4 text-white text-sm opacity-75">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white/20 rounded text-xs">←</kbd>
            <kbd className="px-2 py-1 bg-white/20 rounded text-xs">→</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Esc</kbd>
            <span>Skip</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for managing tutorial state
export function useGlobeTutorial() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false)

  useEffect(() => {
    // Check if user has seen tutorial before
    const seen = localStorage.getItem('globe-tutorial-seen')
    if (seen === 'true') {
      setHasSeenTutorial(true)
    }
  }, [])

  const startTutorial = () => {
    setIsOpen(true)
  }

  const closeTutorial = () => {
    setIsOpen(false)
  }

  const completeTutorial = () => {
    setIsOpen(false)
    setHasSeenTutorial(true)
    localStorage.setItem('globe-tutorial-seen', 'true')
  }

  const resetTutorial = () => {
    setHasSeenTutorial(false)
    localStorage.removeItem('globe-tutorial-seen')
  }

  return {
    isOpen,
    hasSeenTutorial,
    startTutorial,
    closeTutorial,
    completeTutorial,
    resetTutorial
  }
}