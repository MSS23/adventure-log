import dotenv from 'dotenv'
import path from 'node:path'
import { teardownFixture } from './fixtures/seed'

export default async function globalTeardown() {
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') })
  try {
    await teardownFixture()
  } catch (err) {
    console.warn('[e2e] fixture teardown failed (leftovers are reclaimed on next run):', err)
  }
}
