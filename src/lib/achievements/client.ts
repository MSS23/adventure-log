/**
 * Platform-aware achievement calls.
 *
 * On web these delegate to the server actions. On Capacitor the server-action
 * files are swapped with throwing stubs at build time (scripts/mobile-build.mjs),
 * so native goes through the /api/achievements/* route handlers via apiFetch()
 * — same logic, bearer-authenticated (see src/lib/supabase/server.ts).
 */

import { apiFetch, isNativePlatform } from '@/lib/api/client'
import {
  checkAchievements as checkAchievementsAction,
  getMyAchievementProgress as getMyAchievementProgressAction,
  type CheckAchievementsResult,
  type GetProgressResult,
} from '@/app/actions/achievements'

export async function checkAchievementsUniversal(): Promise<CheckAchievementsResult> {
  if (!isNativePlatform()) return checkAchievementsAction()

  try {
    const res = await apiFetch('/api/achievements/check', { method: 'POST' })
    return (await res.json()) as CheckAchievementsResult
  } catch {
    return { success: false, newAchievements: [], error: 'Failed to check achievements' }
  }
}

export async function getMyAchievementProgressUniversal(): Promise<GetProgressResult> {
  if (!isNativePlatform()) return getMyAchievementProgressAction()

  try {
    const res = await apiFetch('/api/achievements/progress')
    return (await res.json()) as GetProgressResult
  } catch {
    return { success: false, progress: [], stats: null, error: 'Failed to get achievement progress' }
  }
}
