'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Camera,
  Globe,
  Plus,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
  Star
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface DashboardOnboardingProps {
  className?: string
}

const QUICK_ACTIONS = [
  {
    icon: Plus,
    title: 'Create Your First Album',
    description: 'Start documenting your adventures',
    href: '/albums/new',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: Globe,
    title: 'Explore the Globe',
    description: 'See how your travels will look',
    href: '/globe',
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-600',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: Camera,
    title: 'View Examples',
    description: 'Get inspired by sample albums',
    href: '/albums',
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50'
  }
]

const BENEFITS = [
  'Organize photos by location and date',
  'Watch flight animations between destinations',
  'Share your adventures with friends',
  'Track your travel statistics and goals'
]

export function DashboardOnboarding({ className }: DashboardOnboardingProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Welcome Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to Adventure Log!</CardTitle>
              <CardDescription className="text-base">
                Transform your travel memories into an interactive experience
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {QUICK_ACTIONS.map((action, index) => {
              const Icon = action.icon
              return (
                <Link key={index} href={action.href}>
                  <Card className={cn(
                    "transition-all duration-200 hover:shadow-md border-2 hover:border-gray-300 cursor-pointer group",
                    action.bgColor
                  )}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className={cn("p-2 rounded-lg w-fit", action.color)}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className={cn("font-semibold group-hover:underline", action.textColor)}>
                            {action.title}
                          </h4>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                        <ArrowRight className={cn(
                          "h-4 w-4 transition-transform group-hover:translate-x-1",
                          action.textColor
                        )} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          <div className="text-center pt-4">
            <Link href="/albums/new">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="h-5 w-5 mr-2" />
                Get Started Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Benefits and Features */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              What You Can Do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {BENEFITS.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Tips for Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload photos with GPS data</p>
                  <p className="text-xs text-gray-600">Location info helps create the map experience</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div>
                  <p className="text-sm font-medium text-gray-900">Add dates to your albums</p>
                  <p className="text-xs text-gray-600">Enable chronological travel animations</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <div>
                  <p className="text-sm font-medium text-gray-900">Write descriptions and captions</p>
                  <p className="text-xs text-gray-600">Capture the stories behind your adventures</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Inspiration */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Globe className="h-12 w-12 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900">Ready to Explore?</h3>
              <p className="text-amber-700">
                Your dashboard will come alive with stats, recent albums, and travel insights once you start creating content.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/albums/new">
                <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                  Create First Album
                </Button>
              </Link>
              <Link href="/globe">
                <Button variant="outline" className="border-amber-600 text-amber-700 hover:bg-amber-50">
                  Preview Globe
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}