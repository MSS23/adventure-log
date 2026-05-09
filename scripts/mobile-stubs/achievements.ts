/**
 * MOBILE STUB — replaces src/app/actions/achievements.ts during MOBILE_BUILD.
 *
 * The original file uses `'use server'` and would fail static export. UI code
 * still imports these functions, so we provide a same-shape module whose
 * functions throw at runtime. The mobile UI MUST NOT call these — wire the
 * relevant features to a `/api/*` route handler called via `apiFetch()`.
 *
 * If you see `MobileStubError` in mobile logs: the caller needs to be ported
 * to use `apiFetch()` against an /api/* endpoint.
 */

import type {
  NewlyEarnedAchievement,
  EarnedAchievement,
  AchievementProgress,
  UserStats,
} from '@/lib/services/achievement-service'

class MobileStubError extends Error {
  constructor(name: string) {
    super(
      `Server action "${name}" was called from a mobile (Capacitor) build. ` +
        `Server actions are not available in static export. Wire this through ` +
        `an /api/* route called via apiFetch() instead.`,
    )
    this.name = 'MobileStubError'
  }
}

export interface CheckAchievementsResult {
  success: boolean
  newAchievements: NewlyEarnedAchievement[]
  error?: string
}

export interface GetAchievementsResult {
  success: boolean
  achievements: EarnedAchievement[]
  error?: string
}

export interface GetProgressResult {
  success: boolean
  progress: AchievementProgress[]
  stats: UserStats | null
  error?: string
}

export async function checkAchievements(): Promise<CheckAchievementsResult> {
  throw new MobileStubError('checkAchievements')
}

export async function getMyAchievements(): Promise<GetAchievementsResult> {
  throw new MobileStubError('getMyAchievements')
}

export async function getMyAchievementProgress(): Promise<GetProgressResult> {
  throw new MobileStubError('getMyAchievementProgress')
}

export async function getUserAchievements(_userId: string): Promise<GetAchievementsResult> {
  throw new MobileStubError('getUserAchievements')
}
