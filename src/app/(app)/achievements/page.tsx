'use client'

import { useAuth } from '@/components/auth/AuthProvider'
import { AchievementsDisplay } from '@/components/achievements/AchievementsDisplay'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'

export default function AchievementsPage() {
  const router = useRouter()
  const { user, authLoading, profileLoading } = useAuth()
  const isAuthLoading = authLoading || profileLoading

  if (!isAuthLoading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-7 w-7" />
          </div>
          <p className="text-muted-foreground mb-4">Log in to view your achievements</p>
          <Button onClick={() => router.push('/login')} className="cursor-pointer">Log In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 md:pb-8 pt-4 sm:pt-6">
      {/* Editorial header */}
      <PageHeader
        className="mb-8"
        eyebrow="Level · Wanderer"
        title="Achievements"
        subtitle="Earn badges by exploring the world and sharing your adventures."
      />

      {/* Achievements Content */}
      {isAuthLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      ) : user ? (
        <AchievementsDisplay />
      ) : null}
    </div>
  )
}
