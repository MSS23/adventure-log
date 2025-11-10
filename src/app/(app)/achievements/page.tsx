'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { AchievementsBadges } from '@/components/achievements/AchievementsBadges'
import { Loader2, Trophy } from 'lucide-react'

export default function AchievementsPage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-7 w-7 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Your Achievements</h1>
          </div>
          <p className="text-sm text-gray-600">
            Earn badges by exploring the world and sharing your adventures
          </p>
        </div>

        {/* Achievements Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <AchievementsBadges userId={user.id} showAll />
        </div>
      </div>
    </div>
  )
}
