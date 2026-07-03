import { NextResponse } from 'next/server'
import { getMyAchievementProgress } from '@/app/actions/achievements'

/**
 * Route-handler twin of the `getMyAchievementProgress` server action, for
 * native clients that cannot invoke server actions — see
 * src/lib/achievements/client.ts.
 */
export async function GET() {
  const result = await getMyAchievementProgress()
  return NextResponse.json(result, { status: result.success ? 200 : 401 })
}
