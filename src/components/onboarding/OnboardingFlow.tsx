'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Camera, Globe, Users, Sparkles, ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action?: () => void
}

export function OnboardingFlow() {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Adventure Log!',
      description: 'Your personal travel journal to capture and share amazing memories from around the world.',
      icon: Sparkles
    },
    {
      id: 'create-album',
      title: 'Create Your First Album',
      description: 'Start documenting your travels by creating an album for your adventures.',
      icon: Camera,
      action: () => router.push('/albums/new')
    },
    {
      id: 'explore-globe',
      title: 'View Your Travel Globe',
      description: 'See all your adventures visualized on an interactive 3D globe.',
      icon: Globe,
      action: () => router.push('/globe')
    },
    {
      id: 'connect',
      title: 'Connect with Others',
      description: 'Follow other travelers and get inspired by their journeys.',
      icon: Users,
      action: () => router.push('/explore')
    }
  ]

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Complete onboarding
      await completeOnboarding()
    }
  }

  const handleSkip = async () => {
    await completeOnboarding()
  }

  const completeOnboarding = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Mark onboarding as complete in user profile
      const { error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      if (error) throw error

      // Redirect to home
      router.push('/feed')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentStepData = steps[currentStep]
  const Icon = currentStepData.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Skip tour
            </button>
          </div>
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "h-2 flex-1 rounded-full transition-all duration-300",
                  index <= currentStep ? "bg-teal-500" : "bg-gray-300"
                )}
              />
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full shadow-lg">
              <Icon className="h-16 w-16 text-teal-600" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-lg mx-auto">
              {currentStepData.description}
            </p>
          </div>

          {/* Features Grid (only on welcome screen) */}
          {currentStep === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <Camera className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Photo Albums</p>
                <p className="text-xs text-gray-600 mt-1">Organize your memories</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <Globe className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">3D Globe</p>
                <p className="text-xs text-gray-600 mt-1">Visualize your travels</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900">Social Features</p>
                <p className="text-xs text-gray-600 mt-1">Connect with travelers</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            {currentStepData.action ? (
              <>
                <Button
                  onClick={handleNext}
                  variant="outline"
                  className="flex-1 h-12 text-base border-gray-300 hover:bg-gray-50"
                >
                  Later
                </Button>
                <Button
                  onClick={currentStepData.action}
                  className="flex-1 h-12 text-base bg-teal-500 hover:bg-teal-600 gap-2"
                  disabled={loading}
                >
                  {steps[currentStep].title.includes('Album') && 'Create Album'}
                  {steps[currentStep].title.includes('Globe') && 'View Globe'}
                  {steps[currentStep].title.includes('Connect') && 'Explore'}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleNext}
                className="w-full h-12 text-base bg-teal-500 hover:bg-teal-600 gap-2"
                disabled={loading}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Check className="h-5 w-5" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                index === currentStep
                  ? "bg-teal-600 w-8"
                  : "bg-gray-400 hover:bg-gray-500"
              )}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
