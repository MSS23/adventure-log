'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  MapPin,
  Camera,
  Plane,
  Plus,
  Star,
  ArrowRight,
  CheckCircle,
  Users,
  TrendingUp,
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TravelTimelineOnboardingProps {
  className?: string
  onGetStarted?: () => void
}

const SAMPLE_DESTINATIONS = [
  { name: 'Paris, France', icon: '🇫🇷', category: 'European Capital' },
  { name: 'Tokyo, Japan', icon: '🇯🇵', category: 'Asian Megacity' },
  { name: 'New York, USA', icon: '🇺🇸', category: 'Urban Adventure' },
  { name: 'Bali, Indonesia', icon: '🇮🇩', category: 'Tropical Paradise' },
  { name: 'Barcelona, Spain', icon: '🇪🇸', category: 'Cultural Hub' },
  { name: 'Dubai, UAE', icon: '🇦🇪', category: 'Modern Wonder' }
]

const ONBOARDING_STEPS = [
  {
    icon: Plus,
    title: 'Create Your First Album',
    description: 'Start by creating an album for your most memorable trip',
    action: 'Create Album',
    href: '/albums/new',
    color: 'bg-blue-500',
    textColor: 'text-blue-600'
  },
  {
    icon: Camera,
    title: 'Upload Your Photos',
    description: 'Add photos with location data to see them on the globe',
    action: 'View Guide',
    href: '#photos',
    color: 'bg-green-500',
    textColor: 'text-green-600'
  },
  {
    icon: MapPin,
    title: 'Explore Your Journey',
    description: 'Watch your travels come to life with flight animations',
    action: 'Learn More',
    href: '#globe',
    color: 'bg-purple-500',
    textColor: 'text-purple-600'
  }
]

const FEATURES = [
  {
    icon: Plane,
    title: 'Flight Animations',
    description: 'Watch realistic flight paths between your destinations'
  },
  {
    icon: Globe,
    title: 'Interactive Globe',
    description: 'Explore your travels on a beautiful 3D globe'
  },
  {
    icon: Users,
    title: 'Share Memories',
    description: 'Share your travel stories with friends and family'
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'See statistics about your travels and goals'
  }
]

export function TravelTimelineOnboarding({ className, onGetStarted }: TravelTimelineOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)

  return (
    <div className={cn("max-w-6xl mx-auto space-y-8", className)}>
      {/* Hero Section */}
      <div className="text-center space-y-6 py-12">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse" />
          </div>
          <Globe className="h-24 w-24 mx-auto text-blue-600 relative z-10" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Welcome to Your Adventure Log
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transform your travel memories into an interactive globe experience.
            Create albums, upload photos, and watch your journeys come to life.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <Badge variant="secondary" className="text-sm">
            Start your travel story today
          </Badge>
        </div>
      </div>

      {/* Getting Started Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Getting Started
          </CardTitle>
          <CardDescription>
            Follow these simple steps to create your first travel experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {ONBOARDING_STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep

              return (
                <div
                  key={index}
                  className={cn(
                    "relative p-6 rounded-lg border-2 transition-all duration-200 cursor-pointer",
                    isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300",
                    isCompleted && "border-green-500 bg-green-50"
                  )}
                  onClick={() => setCurrentStep(index)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={cn(
                        "p-3 rounded-full",
                        isActive ? "bg-blue-500" : isCompleted ? "bg-green-500" : "bg-gray-200"
                      )}>
                        <Icon className={cn(
                          "h-6 w-6",
                          isActive || isCompleted ? "text-white" : "text-gray-500"
                        )} />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Step {index + 1}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <h3 className={cn(
                        "font-semibold",
                        isActive ? "text-blue-900" : isCompleted ? "text-green-900" : "text-gray-900"
                      )}>
                        {step.title}
                      </h3>
                      <p className={cn(
                        "text-sm",
                        isActive ? "text-blue-700" : isCompleted ? "text-green-700" : "text-gray-600"
                      )}>
                        {step.description}
                      </p>
                    </div>

                    <Link href={step.href}>
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                      >
                        {step.action}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Start with Sample Destinations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-yellow-500" />
            Popular Destinations
          </CardTitle>
          <CardDescription>
            Get inspired by these amazing travel destinations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_DESTINATIONS.map((destination, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{destination.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-900">
                      {destination.name}
                    </h4>
                    <p className="text-sm text-gray-600 group-hover:text-blue-700">
                      {destination.category}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link href="/albums/new">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Album
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What You Can Do</CardTitle>
          <CardDescription>
            Discover all the amazing features of Adventure Log
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="text-center space-y-3">
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <Icon className="h-8 w-8 text-gray-700" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center py-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Ready to Start Your Journey?</h2>
          <p className="text-gray-600">
            Create your first album and begin building your travel timeline
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/albums/new">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-5 w-5 mr-2" />
              Create First Album
            </Button>
          </Link>
          <Link href="/albums">
            <Button variant="outline" size="lg">
              <Camera className="h-5 w-5 mr-2" />
              Browse Examples
            </Button>
          </Link>
        </div>

        <div className="pt-4">
          <p className="text-sm text-gray-500">
            💡 Tip: Upload photos with location data (GPS) for the best experience
          </p>
        </div>
      </div>
    </div>
  )
}