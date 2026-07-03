import { NextResponse } from 'next/server'
import { checkAchievements } from '@/app/actions/achievements'

/**
 * Route-handler twin of the `checkAchievements` server action.
 *
 * The Capacitor app cannot invoke server actions (they're stubbed out of the
 * static bundle), so native clients POST here via apiFetch() instead — see
 * src/lib/achievements/client.ts. Auth (cookie or bearer) is resolved inside
 * the action's server Supabase client.
 */
export async function POST() {
  const result = await checkAchievements()
  return NextResponse.json(result, { status: result.success ? 200 : 401 })
}
