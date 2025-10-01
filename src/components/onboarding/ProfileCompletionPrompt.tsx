'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { User, Camera, FileText, X } from 'lucide-react'
import Link from 'next/link'
import { User as UserType } from '@/types/database'

interface ProfileCompletionPromptProps {
  profile: UserType | null
  onDismiss?: () => void
}

export function ProfileCompletionPrompt({ profile, onDismiss }: ProfileCompletionPromptProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!profile || dismissed) return null

  // Calculate profile completion
  const completionItems = [
    { key: 'name', label: 'Add your name', completed: !!profile.name, icon: User },
    { key: 'bio', label: 'Write a bio', completed: !!profile.bio, icon: FileText },
    { key: 'avatar', label: 'Upload profile picture', completed: !!profile.avatar_url, icon: Camera },
  ]

  const completedCount = completionItems.filter(item => item.completed).length
  const completionPercentage = (completedCount / completionItems.length) * 100

  // Don't show if profile is complete
  if (completionPercentage === 100) return null

  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Complete Your Profile</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {completionPercentage === 0
                ? "Get started by adding some basic information to your profile"
                : `You're ${completionPercentage.toFixed(0)}% complete! Finish setting up to get the most out of Adventure Log.`
              }
            </p>
            <Progress value={completionPercentage} className="h-2 mb-4" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Completion Checklist */}
        <div className="space-y-2 mb-4">
          {completionItems.map(item => {
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className={`flex items-center gap-2 text-sm ${
                  item.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                }`}
              >
                <Icon className={`h-4 w-4 ${item.completed ? 'text-green-500' : 'text-gray-400'}`} />
                <span>{item.label}</span>
                {item.completed && <span className="text-green-500 ml-auto">✓</span>}
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href="/profile/edit" className="flex-1">
            <Button className="w-full">
              Complete Profile
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDismiss}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
