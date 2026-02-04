'use client'

/**
 * AchievementProvider
 *
 * Global context provider for achievement notifications.
 * Manages the queue of achievements to display and shows
 * the unlock modal when new achievements are earned.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { AchievementUnlock, type Achievement as UnlockAchievement } from './AchievementUnlock'
import { checkAchievements } from '@/app/actions/achievements'
import { useAuth } from '@/components/auth/AuthProvider'
import { log } from '@/lib/utils/logger'
import type { NewlyEarnedAchievement } from '@/lib/services/achievement-service'
import type { AchievementType } from './AchievementUnlock'

interface AchievementContextValue {
  // Queue a new achievement for display
  queueAchievement: (achievement: NewlyEarnedAchievement) => void

  // Queue multiple achievements
  queueAchievements: (achievements: NewlyEarnedAchievement[]) => void

  // Trigger an achievement check (after album creation, etc.)
  triggerAchievementCheck: () => Promise<NewlyEarnedAchievement[]>

  // Current queue size
  pendingCount: number
}

const AchievementContext = createContext<AchievementContextValue | null>(null)

export function useAchievementNotifications() {
  const context = useContext(AchievementContext)
  if (!context) {
    throw new Error('useAchievementNotifications must be used within AchievementProvider')
  }
  return context
}

interface AchievementProviderProps {
  children: ReactNode
}

export function AchievementProvider({ children }: AchievementProviderProps) {
  const { user } = useAuth()
  const [queue, setQueue] = useState<NewlyEarnedAchievement[]>([])
  const [currentAchievement, setCurrentAchievement] = useState<NewlyEarnedAchievement | null>(null)
  const [showModal, setShowModal] = useState(false)

  // Convert our achievement format to the unlock modal format
  const convertToUnlockFormat = (achievement: NewlyEarnedAchievement): UnlockAchievement => ({
    id: achievement.id,
    type: achievement.type as AchievementType,
    title: achievement.name,
    description: achievement.description,
    rarity: achievement.rarity as 'common' | 'rare' | 'epic' | 'legendary',
    unlockedAt: new Date(achievement.earnedAt)
  })

  // Show next achievement from queue
  const showNext = useCallback(() => {
    if (queue.length > 0) {
      const [next, ...rest] = queue
      setCurrentAchievement(next)
      setQueue(rest)
      setShowModal(true)
    }
  }, [queue])

  // Handle modal close
  const handleClose = useCallback(() => {
    setShowModal(false)
    setCurrentAchievement(null)

    // Show next achievement after a brief delay
    setTimeout(() => {
      if (queue.length > 0) {
        showNext()
      }
    }, 300)
  }, [queue, showNext])

  // Queue a single achievement
  const queueAchievement = useCallback((achievement: NewlyEarnedAchievement) => {
    setQueue(prev => [...prev, achievement])
  }, [])

  // Queue multiple achievements
  const queueAchievements = useCallback((achievements: NewlyEarnedAchievement[]) => {
    if (achievements.length > 0) {
      setQueue(prev => [...prev, ...achievements])
    }
  }, [])

  // Trigger achievement check
  const triggerAchievementCheck = useCallback(async (): Promise<NewlyEarnedAchievement[]> => {
    if (!user) return []

    try {
      const result = await checkAchievements()

      if (result.success && result.newAchievements.length > 0) {
        log.info('Achievement check found new achievements', {
          component: 'AchievementProvider',
          action: 'triggerAchievementCheck',
          count: result.newAchievements.length
        })

        queueAchievements(result.newAchievements)
        return result.newAchievements
      }

      return []
    } catch (error) {
      log.error('Achievement check failed', {
        component: 'AchievementProvider',
        action: 'triggerAchievementCheck'
      }, error instanceof Error ? error : new Error(String(error)))

      return []
    }
  }, [user, queueAchievements])

  // Show first achievement when queue gets items and nothing is showing
  useEffect(() => {
    if (queue.length > 0 && !showModal && !currentAchievement) {
      showNext()
    }
  }, [queue, showModal, currentAchievement, showNext])

  // Check achievements on initial login
  useEffect(() => {
    if (user) {
      // Delay the initial check to avoid blocking page load
      const timer = setTimeout(() => {
        triggerAchievementCheck()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user, triggerAchievementCheck])

  const value: AchievementContextValue = {
    queueAchievement,
    queueAchievements,
    triggerAchievementCheck,
    pendingCount: queue.length
  }

  return (
    <AchievementContext.Provider value={value}>
      {children}

      {/* Achievement Unlock Modal */}
      {currentAchievement && (
        <AchievementUnlock
          achievement={convertToUnlockFormat(currentAchievement)}
          show={showModal}
          onClose={handleClose}
          autoClose={6000}
        />
      )}
    </AchievementContext.Provider>
  )
}
