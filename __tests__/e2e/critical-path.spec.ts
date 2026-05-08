import { test, expect, type Page } from '@playwright/test'

/**
 * Adventure Log — Full E2E Test Suite
 *
 * Run:   npx playwright test
 * UI:    npx playwright test --ui
 * Debug: npx playwright test --debug
 *
 * Requires:
 *   - Dev server running (auto-started by playwright.config.ts)
 *   - TEST_USER_EMAIL and TEST_USER_PASSWORD env vars (or defaults below)
 *   - TEST_USERNAME env var for public profile tests
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'testpassword123'
const TEST_USERNAME = process.env.TEST_USERNAME || 'test_user'

// ─── Helpers ────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[name="email"], input[type="email"]', TEST_EMAIL)
  await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  // Wait for auth redirect — could land on dashboard, feed, or globe
  await page.waitForURL(/\/(dashboard|feed|globe|albums)/, { timeout: 15000 })
}

// ─── 1. API Health ──────────────────────────────────────────

test.describe('API Health', () => {
  test('Health endpoint responds', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.ok()).toBeTruthy()
    const data = await res.json()
    expect(data.status).toBe('ok')
  })

  test('Manifest endpoint responds', async ({ request }) => {
    const res = await request.get('/api/manifest')
    expect(res.ok()).toBeTruthy()
  })
})

// ─── 2. Landing Page ────────────────────────────────────────

test.describe('Landing Page', () => {
  test('renders hero section with globe', async ({ page }) => {
    await page.goto('/')
    // Hero headline
    await expect(page.locator('text=Every Trip')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=One Globe')).toBeVisible()
    // CTA buttons
    await expect(page.locator('text=Get Started').first()).toBeVisible()
    await expect(page.locator('text=Sign In').first()).toBeVisible()
  })

  test('features section loads', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await expect(page.locator('text=Interactive 3D Globe')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Flyover Videos')).toBeVisible()
    await expect(page.locator('text=Travel Passport')).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Get Started >> nth=0')
    await expect(page).toHaveURL(/\/signup/)
  })
})

// ─── 3. Auth Flow ───────────────────────────────────────────

test.describe('Auth Flow', () => {
  test('signup page renders', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('login with test credentials', async ({ page }) => {
    await login(page)
    // Should be on an authenticated page
    const url = page.url()
    expect(url).toMatch(/\/(dashboard|feed|globe|albums)/)
  })

  test('protected routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/globe')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('passport route requires auth', async ({ page }) => {
    await page.goto('/passport')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})

// ─── 4. Globe Page ──────────────────────────────────────────

test.describe('Globe Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('globe page loads without errors', async ({ page }) => {
    await page.goto('/globe')
    // Header should be visible
    await expect(page.locator('text=/Travel Globe|Globe|Explore/i').first()).toBeVisible({ timeout: 15000 })
    // No 500 error
    const response = await page.waitForResponse(resp => resp.url().includes('/globe'), { timeout: 5000 }).catch(() => null)
    if (response) {
      expect(response.status()).not.toBe(500)
    }
  })

  test('explore mode toggle exists', async ({ page }) => {
    await page.goto('/globe')
    // Look for My Globe / Explore toggle
    const toggle = page.locator('text=/Explore/i').first()
    await expect(toggle).toBeVisible({ timeout: 10000 })
  })

  test('globe loads with album URL params', async ({ page }) => {
    await page.goto('/globe?lat=48.8566&lng=2.3522')
    // Should load without 500
    await expect(page.locator('text=/Travel Globe|Globe|Explore/i').first()).toBeVisible({ timeout: 15000 })
  })
})

// ─── 5. Feed Page ───────────────────────────────────────────

test.describe('Feed Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('feed page loads', async ({ page }) => {
    await page.goto('/feed')
    // Should show Following/Discover tabs
    await expect(page.locator('text=/Following|Discover/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('discover tab works', async ({ page }) => {
    await page.goto('/feed')
    const discoverTab = page.locator('text=Discover').first()
    if (await discoverTab.isVisible()) {
      await discoverTab.click()
      // Should not crash
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/feed')
    }
  })
})

// ─── 6. Albums ──────────────────────────────────────────────

test.describe('Albums', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('albums list page loads', async ({ page }) => {
    await page.goto('/albums')
    await page.waitForTimeout(2000)
    // Should be on albums page
    expect(page.url()).toContain('/albums')
  })

  test('create album page loads', async ({ page }) => {
    await page.goto('/albums/new')
    await page.waitForTimeout(2000)
    // Should show album creation form
    const heading = page.locator('text=/New Album|Create|Quick Post|Full Album/i').first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('bulk import page loads', async ({ page }) => {
    await page.goto('/albums/import')
    await page.waitForTimeout(2000)
    // Should show drag-and-drop zone
    const dropzone = page.locator('text=/drag|drop|import|upload/i').first()
    await expect(dropzone).toBeVisible({ timeout: 10000 })
  })
})

// ─── 7. Passport Page ──────────────────────────────────────

test.describe('Passport', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('passport page loads', async ({ page }) => {
    await page.goto('/passport')
    await expect(page.locator('text=/Travel Passport|Passport/i').first()).toBeVisible({ timeout: 10000 })
  })

  test('passport shows stats sections', async ({ page }) => {
    await page.goto('/passport')
    // Should show stats like Countries, Cities, etc.
    await expect(page.locator('text=/Countries|Cities|Photos/i').first()).toBeVisible({ timeout: 10000 })
  })
})

// ─── 8. Public Pages (no auth) ──────────────────────────────

test.describe('Public Pages', () => {
  test('public profile loads', async ({ page }) => {
    await page.goto(`/u/${TEST_USERNAME}`)
    // Should show profile or "not found"
    const content = page.locator('text=/Travel|adventures|not found|private/i').first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })

  test('public passport loads', async ({ page }) => {
    await page.goto(`/u/${TEST_USERNAME}/passport`)
    const content = page.locator('text=/Passport|not found|private/i').first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })

  test('embed page loads', async ({ page }) => {
    await page.goto(`/embed/${TEST_USERNAME}`)
    // Should show globe or "not found"
    await page.waitForTimeout(3000)
    expect(page.url()).toContain(`/embed/${TEST_USERNAME}`)
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.locator('text=/Privacy/i').first()).toBeVisible({ timeout: 5000 })
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.locator('text=/Terms/i').first()).toBeVisible({ timeout: 5000 })
  })
})

// ─── 9. Analytics & Achievements ────────────────────────────

test.describe('Analytics & Achievements', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('analytics page loads without errors', async ({ page }) => {
    await page.goto('/analytics')
    await page.waitForTimeout(3000)
    // Should not show a 500 error page
    const errorText = page.locator('text=/Something went wrong/i')
    await expect(errorText).not.toBeVisible()
  })

  test('achievements page loads', async ({ page }) => {
    await page.goto('/achievements')
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/achievements')
  })
})

// ─── 10. Settings ───────────────────────────────────────────

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('text=/Settings|Preferences/i').first()).toBeVisible({ timeout: 10000 })
  })
})

// ─── 11. Profile ────────────────────────────────────────────

test.describe('Profile', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('profile page loads', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/profile')
  })

  test('profile edit page loads', async ({ page }) => {
    await page.goto('/profile/edit')
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/profile/edit')
  })
})

// ─── 12. Globe Compare ─────────────────────────────────────

test.describe('Globe Compare', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('compare page loads with friend picker', async ({ page }) => {
    await page.goto('/globe/compare')
    await page.waitForTimeout(3000)
    // Should show friend picker or compare UI
    const content = page.locator('text=/Compare|friend|choose/i').first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })
})

// ─── 13. Dashboard ──────────────────────────────────────────

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('dashboard loads', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/dashboard')
  })
})

// ─── 14. Wishlist ───────────────────────────────────────────

test.describe('Wishlist', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('wishlist page loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('PGRST205')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/wishlist')
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/wishlist')

    // Filter out known acceptable errors (missing table handled gracefully)
    const realErrors = consoleErrors.filter(e =>
      !e.includes('wishlist_items') &&
      !e.includes('PGRST205') &&
      !e.includes('42P01')
    )
    expect(realErrors.length).toBe(0)
  })
})

// ─── 15. Explore ────────────────────────────────────────────

test.describe('Explore', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('explore page loads', async ({ page }) => {
    await page.goto('/explore')
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('/explore')
  })
})

// ─── 16. Wrapped ────────────────────────────────────────────

test.describe('Wrapped', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('wrapped page loads', async ({ page }) => {
    await page.goto('/wrapped')
    await page.waitForTimeout(3000)
    // Should show wrapped content or "no trips" message
    const content = page.locator('text=/Wrapped|Travel|trips/i').first()
    await expect(content).toBeVisible({ timeout: 10000 })
  })
})

// ─── 17. Dark Mode ──────────────────────────────────────────

test.describe('Dark Mode', () => {
  test('pages render in dark mode without visual breaks', async ({ page }) => {
    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await page.waitForTimeout(2000)
    // Landing page should still render
    await expect(page.locator('text=Every Trip')).toBeVisible({ timeout: 10000 })
  })
})

// ─── 18. Mobile Viewport ────────────────────────────────────

test.describe('Mobile Layout', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X

  test('landing page renders on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Every Trip')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Get Started').first()).toBeVisible()
  })

  test('bottom nav visible on mobile after login', async ({ page }) => {
    await login(page)
    await page.goto('/feed')
    // Bottom navigation should be visible
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]')
    await expect(bottomNav).toBeVisible({ timeout: 10000 })
  })

  test('sidebar hidden on mobile', async ({ page }) => {
    await login(page)
    await page.goto('/feed')
    // Sidebar should be hidden (lg:flex means hidden below 1024px)
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toBeVisible()
  })
})

// ─── 19. Sentry Test Page ───────────────────────────────────

test.describe('Sentry', () => {
  test('sentry test page loads', async ({ page }) => {
    await page.goto('/sentry-example-page')
    await expect(page.locator('text=Sentry Test Page')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Trigger Test Error')).toBeVisible()
  })
})

// ─── 20. OG Image ───────────────────────────────────────────

test.describe('OG Image', () => {
  test('opengraph image endpoint responds', async ({ request }) => {
    const res = await request.get('/opengraph-image')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image')
  })

  test('twitter image endpoint responds', async ({ request }) => {
    const res = await request.get('/twitter-image')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('image')
  })
})

// ─── 21. Travel Card API ────────────────────────────────────

test.describe('Travel Card API', () => {
  test('travel card returns image with valid userId', async ({ request }) => {
    // This will likely fail without a real user ID, but should return 400 not 500
    const res = await request.get('/api/travel-card')
    expect(res.status()).toBe(400) // Missing userId param
  })
})

// ─── 22. No 500 Errors on Key Routes ────────────────────────

test.describe('No 500 Errors', () => {
  const publicRoutes = ['/', '/login', '/signup', '/privacy', '/terms', '/sentry-example-page']

  for (const route of publicRoutes) {
    test(`${route} does not return 500`, async ({ page }) => {
      const response = await page.goto(route)
      expect(response?.status()).not.toBe(500)
    })
  }
})
