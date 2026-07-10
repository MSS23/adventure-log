/**
 * Playwright global setup — seeds the e2e fixture users/data.
 *
 * Never fails the run: without SUPABASE_SERVICE_ROLE_KEY (e.g. the CI smoke
 * subset) seeding is skipped and fixture-dependent specs skip themselves via
 * readFixtureState() === null.
 */

import dotenv from 'dotenv'
import path from 'node:path'
import { seedFixture } from './fixtures/seed'

export default async function globalSetup() {
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') })
  try {
    const state = await seedFixture()
    if (state) {
      console.log(`[e2e] fixture seeded: ${state.mainUsername} + ${state.friendUsername}`)
    } else {
      console.log('[e2e] no service-role key — fixture specs will be skipped')
    }
  } catch (err) {
    console.warn('[e2e] fixture seeding failed — fixture specs will be skipped:', err)
  }
}
