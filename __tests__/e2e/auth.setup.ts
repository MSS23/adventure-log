import { test as setup, expect } from '@playwright/test'
import {
  readFixtureState,
  MAIN_STORAGE_STATE,
  FRIEND_STORAGE_STATE,
} from './fixtures/seed'

/**
 * Auth setup project — logs in each fixture user ONCE through the real UI
 * and saves the browser storage state. The journey specs then start
 * pre-authenticated instead of every test running its own login (which
 * hammered the dev server with parallel logins and tripped timeouts).
 */

const fixture = readFixtureState()

setup.describe.configure({ mode: 'serial' })
// First-compile + hydration + retries can legitimately take a while on the
// dev server; this only runs twice per suite.
setup.setTimeout(180_000)

async function loginAndSave(page: import('@playwright/test').Page, email: string, password: string, file: string) {
  await page.goto('/login')

  // Hydration race: filling the server-rendered form before React hydrates
  // gets wiped when the controlled inputs mount (state '' overwrites the DOM
  // value), and the click then submits an empty form that HTML5 validation
  // silently blocks. React stamps a __reactFiber$ key on nodes it has
  // hydrated — wait for it before typing.
  await page.waitForFunction(() => {
    const el = document.querySelector('input[type="email"]')
    return !!el && Object.keys(el).some((k) => k.startsWith('__react'))
  }, { timeout: 60000 })

  const emailBox = page.locator('input[type="email"]')
  for (let attempt = 0; attempt < 3; attempt++) {
    await emailBox.fill(email)
    await page.fill('input[type="password"]', password)
    if ((await emailBox.inputValue()) !== email) continue
    await page.click('button[type="submit"]')
    try {
      await page.waitForURL(/\/(dashboard|feed|globe|albums)/, { timeout: 25000 })
      break
    } catch {
      if (attempt === 2) throw new Error(`login did not navigate for ${email}`)
    }
  }
  await expect(page.getByRole('heading', { name: 'Travel Memories' })).toBeVisible({ timeout: 30000 })
  await page.context().storageState({ path: file })
}

setup('authenticate main fixture user', async ({ page }) => {
  setup.skip(!fixture, 'e2e fixture not seeded')
  await loginAndSave(page, fixture!.mainEmail, fixture!.password, MAIN_STORAGE_STATE)
})

setup('authenticate friend fixture user', async ({ page }) => {
  setup.skip(!fixture, 'e2e fixture not seeded')
  await loginAndSave(page, fixture!.friendEmail, fixture!.password, FRIEND_STORAGE_STATE)
})
