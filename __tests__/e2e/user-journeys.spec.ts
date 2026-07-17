import { test, expect } from '@playwright/test'
import {
  readFixtureState,
  MAIN_STORAGE_STATE,
  FRIEND_STORAGE_STATE,
  type FixtureState,
} from './fixtures/seed'

/**
 * Adventure Log — journey-level e2e suite (chromium project only).
 *
 * Runs pre-authenticated via the `setup` project's saved storage state, over
 * the SEEDED fixture users (see fixtures/seed.ts):
 *   e2e_main   — London 2025 + Paris 2026 albums, Kyoto wishlist item
 *   e2e_friend — Athens album + an Athens place recommendation,
 *                mutually following e2e_main
 *
 * Each block regression-tests a real production bug fixed in July 2026,
 * plus the "My Map" layers feature. Specs self-skip when the fixture isn't
 * seeded (no service-role key), so the CI smoke subset is unaffected.
 *
 * Run:  npx playwright test user-journeys --project=chromium
 */

// Collection-time gate: globalSetup has already run (or skipped) by the time
// specs are collected, so the fixture state file is authoritative. The saved
// AUTH files are NOT checked here — they're created by the `setup` project,
// which the chromium project depends on; if setup fails, Playwright skips
// the dependent project itself.
const fixture: FixtureState | null = readFixtureState()

test.describe('Main user journeys', () => {
  test.skip(!fixture, 'e2e fixture not seeded (SUPABASE_SERVICE_ROLE_KEY missing)')
  test.use({ storageState: MAIN_STORAGE_STATE })

  test('session survives reload and a fresh tab', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByRole('heading', { name: 'Travel Memories' })).toBeVisible({ timeout: 20000 })
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Travel Memories' })).toBeVisible({ timeout: 20000 })

    const freshTab = await page.context().newPage()
    await freshTab.goto('/feed')
    await expect(freshTab.getByRole('heading', { name: 'Travel Memories' })).toBeVisible({ timeout: 20000 })
    await freshTab.close()
  })

  // ── Feed (home) ───────────────────────────────────────────────────────

  test('feed shows one suggestions surface and the Your map pill', async ({ page }) => {
    await page.goto('/feed')
    await expect(page.getByRole('heading', { name: 'Travel Memories' })).toBeVisible({ timeout: 20000 })

    // Discovery pills — including the new map entry point. (.first(): the
    // feed can legitimately carry more than one /map link.)
    await expect(page.getByRole('link', { name: /Your map/i }).first()).toBeVisible()

    // The old duplicate header avatar strip is gone.
    await expect(page.locator('section[aria-label="Suggested travelers"]')).toHaveCount(0)
  })

  // ── Wrapped (fly-animation regression) ────────────────────────────────

  test('wrapped offers All Time when trips span years', async ({ page }) => {
    await page.goto('/wrapped')

    // London is dated 2025, Paris 2026 — the current-year view has one pin,
    // so the intro must offer the cross-year escape hatch instead of
    // silently playing the single-pin spotlight.
    await expect(page.getByText(/trips span more than one year/i)).toBeVisible({ timeout: 30000 })

    // Taking it switches to All Time and the hint goes away.
    await page.getByRole('button', { name: 'Watch All Time' }).click()
    await expect(page.getByText(/trips span more than one year/i)).toHaveCount(0)
  })

  // ── My Map (layers + friend recommendations) ──────────────────────────

  test('map shows all five layers with fixture pins', async ({ page }) => {
    await page.goto('/map')

    await expect(page.getByRole('heading', { name: 'Map' })).toBeVisible({ timeout: 20000 })

    // First visit: the onboarding tour auto-starts (the "don't overwhelm
    // users" affordance). Verify it appears, then dismiss it so the pills
    // are clickable — its popover intercepts pointer events while open.
    const skipTour = page.getByRole('button', { name: /Skip tour/i })
    await expect(skipTour).toBeVisible({ timeout: 15000 })
    await skipTour.click()
    await expect(skipTour).toHaveCount(0)

    // All five layer pills render.
    for (const label of ['Been', 'Friends', 'Trips', 'Wishlist', 'Friends recommend']) {
      await expect(page.getByRole('button', { name: new RegExp(label, 'i') }).first()).toBeVisible()
    }

    // Counts materialize (no eternal "…"): Been=2 (London+Paris),
    // Friends recommend=1 (Acropolis).
    const beenPill = page.getByRole('button', { name: /Been/i }).first()
    await expect(beenPill).toContainText('2', { timeout: 30000 })
    const recsPill = page.getByRole('button', { name: /Friends recommend/i }).first()
    await expect(recsPill).toContainText('1', { timeout: 30000 })

    // Toggling a layer flips its pressed state.
    await recsPill.click()
    await expect(recsPill).toHaveAttribute('aria-pressed', 'false')
    await recsPill.click()
    await expect(recsPill).toHaveAttribute('aria-pressed', 'true')
  })

  test('explore links to Your Map', async ({ page }) => {
    await page.goto('/explore')
    // Scoped to the editorial <header> — the sidebar also has a "Your Map"
    // item, and rendering /map after a click is already covered by the
    // direct-goto map spec above.
    const mapLink = page.locator('main header').getByRole('link', { name: /Your Map/i })
    await expect(mapLink).toBeVisible({ timeout: 20000 })
    await expect(mapLink).toHaveAttribute('href', '/map')
  })

  // ── Passport QR (connect-consistency regression) ──────────────────────

  test('passport QR waits for the connect token (no tokenless window)', async ({ page }) => {
    await page.goto('/passport')
    await expect(page.getByText(/Share with friends/i)).toBeVisible({ timeout: 30000 })
    // The QR (svg or canvas in the share card) must appear — and once it
    // does, the token has minted (the component holds a spinner until then).
    await expect(page.locator('svg[role="img"], canvas').last()).toBeVisible({ timeout: 30000 })
  })

  test('travel blend renders against the mutual friend', async ({ page }) => {
    await page.goto(`/blend/${fixture!.friendUsername}`)
    // Blend needs mutual accepted follows + readable albums on both sides —
    // the fixture guarantees both, so the private/empty states are failures.
    await expect(page.getByText(/can(’|')t blend yet|is private/i)).toHaveCount(0, { timeout: 30000 })
  })

  // ── Wishlist ──────────────────────────────────────────────────────────

  test('wishlist shows the seeded destination', async ({ page }) => {
    await page.goto('/wishlist')
    await expect(page.getByText(/Kyoto/i).first()).toBeVisible({ timeout: 30000 })
  })
})

// ── Friend-side journey (separate auth state) ─────────────────────────────

test.describe('Friend user journeys', () => {
  test.skip(!fixture, 'e2e fixture not seeded (SUPABASE_SERVICE_ROLE_KEY missing)')
  test.use({ storageState: FRIEND_STORAGE_STATE })

  test('scanning a public passport connects both directions immediately', async ({ page }) => {
    // The friend "scans" main's passport: opening the connect URL is exactly
    // what the QR resolves to. Both accounts are public, so this must land
    // on the full mutual success — not the half-connected state.
    await page.goto(`/u/${fixture!.mainUsername}/passport?connect=true`)

    await expect(
      page.getByText(/You(’|')re now connected|are now following each other/i).first()
    ).toBeVisible({ timeout: 30000 })

    // Full-mutual path → the blend CTA, not the "review follow request" one.
    await expect(page.getByRole('link', { name: /See your Travel Blend/i }).first()).toBeVisible()
  })
})

// ── Auth surfaces (no fixture needed) ────────────────────────────────────

test.describe('Auth surfaces', () => {
  test('login exposes Google sign-in', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
  })

  test('interactive elements carry touch-action manipulation', async ({ page }) => {
    // Regression for the ~300ms WebView tap delay: the sign-in button must
    // compute touch-action: manipulation (was documented but never applied).
    await page.goto('/login')
    const touchAction = await page
      .locator('button[type="submit"]')
      .evaluate((el) => getComputedStyle(el).touchAction)
    expect(touchAction).toBe('manipulation')
  })
})
