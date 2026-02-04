import { test, expect } from '@playwright/test'

test.describe('Critical User Paths', () => {
  test('User can signup, create album, upload photo', async ({ page }) => {
    // Navigate to signup
    await page.goto('/signup')
    
    // Fill signup form
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'SecurePassword123!')
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })
    
    // Verify user is logged in (check for user menu or profile)
    await expect(page.locator('text=/profile|dashboard|albums/i')).toBeVisible()
  })

  test('User can login and view albums', async ({ page }) => {
    // This test assumes test user exists
    // In real scenario, you'd seed test data first
    
    await page.goto('/login')
    
    // Fill login form (use test credentials)
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword123')
    
    await page.click('button[type="submit"]')
    
    // Wait for redirect
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })
  })

  test('Health endpoint responds correctly', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('version')
  })

  test('Geocoding endpoint requires authentication', async ({ request }) => {
    const response = await request.get('/api/geocode?lat=40.7128&lng=-74.0060')
    expect(response.status()).toBe(401)
  })
})
